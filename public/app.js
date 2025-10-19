// FitMemory Client Application
class FitMemoryApp {
    constructor() {
        this.messagesContainer = document.getElementById('messages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.typingIndicator = document.getElementById('typing');
        
        this.isLoading = false;
        
        this.init();
    }
    
    async init() {
        // Load initial data
        await this.loadMessages();
        await this.loadStats();
        await this.loadPatternSummary();
        
        // Scroll to bottom
        this.scrollToBottom();
        
        // Focus input
        this.messageInput.focus();
        
        console.log('FitMemory app initialized');
    }
    
    async loadMessages() {
        try {
            const response = await fetch('/api/messages?limit=20');
            const data = await response.json();
            
            if (data.messages && data.messages.length > 0) {
                this.messagesContainer.innerHTML = '';
                data.messages.forEach(message => this.displayMessage(message));
            } else {
                // Show welcome message if no history
                this.displayWelcomeMessage();
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
            this.displayWelcomeMessage();
        }
    }
    
    displayWelcomeMessage() {
        const welcomeMessage = {
            role: 'system',
            content: 'Welcome to FitMemory! I\'m your personal workout coach. Tell me about your workouts, ask for advice, or request a training plan. Try the quick buttons below to get started!',
            createdAt: new Date().toISOString()
        };
        this.displayMessage(welcomeMessage);
    }
    
    displayMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.role}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = message.role === 'user' ? 'U' : message.role === 'assistant' ? 'F' : 'S';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = message.content;
        
        // Add workout logged indicator
        if (message.meta && message.meta.workoutLogged) {
            const workoutIndicator = document.createElement('div');
            workoutIndicator.className = 'workout-logged';
            workoutIndicator.textContent = '✅ Workout logged automatically';
            content.appendChild(workoutIndicator);
        }
        
        messageEl.appendChild(avatar);
        messageEl.appendChild(content);
        
        this.messagesContainer.appendChild(messageEl);
        this.scrollToBottom();
    }
    
    async sendMessage(content) {
        if (!content.trim() || this.isLoading) return;
        
        // Display user message immediately
        const userMessage = {
            role: 'user',
            content: content,
            createdAt: new Date().toISOString()
        };
        this.displayMessage(userMessage);
        
        // Clear input
        this.messageInput.value = '';
        this.adjustTextareaHeight(this.messageInput);
        
        // Show loading state
        this.setLoading(true);
        this.showTyping();
        
        try {
            const response = await fetch('/api/converse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: content })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to send message');
            }
            
            // Display assistant response
            const assistantMessage = {
                role: 'assistant',
                content: data.reply,
                createdAt: new Date().toISOString(),
                meta: { 
                    workoutLogged: data.workoutLogged,
                    actions: data.actions 
                }
            };
            this.displayMessage(assistantMessage);
            
            // Update stats if workout was logged
            if (data.workoutLogged) {
                await this.loadStats();
                await this.loadPatternSummary();
            }
            
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage = {
                role: 'system',
                content: 'Sorry, I\'m having trouble responding right now. Please try again.',
                createdAt: new Date().toISOString()
            };
            this.displayMessage(errorMessage);
        } finally {
            this.setLoading(false);
            this.hideTyping();
            this.messageInput.focus();
        }
    }
    
    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            
            document.getElementById('streakValue').textContent = stats.dailyStreak || 0;
            document.getElementById('weeklyValue').textContent = stats.weeklyCounts ? stats.weeklyCounts[3] || 0 : 0;
            document.getElementById('avgValue').textContent = stats.rollingAverage || 0;
            document.getElementById('trendValue').textContent = this.formatTrend(stats.trend);
            
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }
    
    async loadPatternSummary() {
        try {
            const response = await fetch('/api/patternSummary');
            const data = await response.json();
            
            document.getElementById('patternSummary').textContent = data.summary || 'Building your routine...';
            
        } catch (error) {
            console.error('Failed to load pattern summary:', error);
            document.getElementById('patternSummary').textContent = 'Unable to load patterns';
        }
    }
    
    formatTrend(trend) {
        const trendMap = {
            'improving': '📈',
            'declining': '📉',
            'stable': '➡️'
        };
        return trendMap[trend] || '➡️';
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        this.sendBtn.disabled = loading;
        document.body.classList.toggle('loading', loading);
    }
    
    showTyping() {
        this.typingIndicator.classList.add('show');
        this.scrollToBottom();
    }
    
    hideTyping() {
        this.typingIndicator.classList.remove('show');
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }
    
    adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
    
    // Admin functions
    async exportData() {
        try {
            const response = await fetch('/api/export');
            const blob = await response.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `fitmemory-export-${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showNotification('Data exported successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('Export failed', 'error');
        }
    }
    
    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            const response = await fetch('/api/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Import failed');
            }
            
            this.showNotification(`Import completed: ${result.imported} records imported, ${result.skipped} skipped`, 'success');
            
            // Reload data
            await this.loadMessages();
            await this.loadStats();
            await this.loadPatternSummary();
            
        } catch (error) {
            console.error('Import failed:', error);
            this.showNotification('Import failed: ' + error.message, 'error');
        } finally {
            // Clear the file input
            event.target.value = '';
        }
    }
    
    async createBackup() {
        try {
            const response = await fetch('/api/backup', { method: 'POST' });
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Backup failed');
            }
            
            this.showNotification(`Backup created: ${result.totalRecords} records`, 'success');
        } catch (error) {
            console.error('Backup failed:', error);
            this.showNotification('Backup failed', 'error');
        }
    }
    
    async clearMemory() {
        if (!confirm('Are you sure you want to clear all long-term memories? This cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch('/api/clear-memory', { method: 'POST' });
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Clear memory failed');
            }
            
            this.showNotification(`Memory cleared: ${result.deletedCount} memories deleted`, 'success');
        } catch (error) {
            console.error('Clear memory failed:', error);
            this.showNotification('Clear memory failed', 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        // Simple notification - could be enhanced with a proper notification system
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007aff'};
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }
}

// Global functions for HTML event handlers
let app;

function sendMessage(event) {
    event.preventDefault();
    const content = document.getElementById('messageInput').value;
    app.sendMessage(content);
}

function insertQuickMessage(message) {
    document.getElementById('messageInput').value = message;
    document.getElementById('messageInput').focus();
}

function adjustTextareaHeight(textarea) {
    app.adjustTextareaHeight(textarea);
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage(event);
    }
}

function exportData() {
    app.exportData();
}

function importData(event) {
    app.importData(event);
}

function createBackup() {
    app.createBackup();
}

function clearMemory() {
    app.clearMemory();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new FitMemoryApp();
});

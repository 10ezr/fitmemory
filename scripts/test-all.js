#!/usr/bin/env node

/**
 * Comprehensive Test Suite for FitMemory
 * Tests all major functionality including streak updates
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

class FitMemoryTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.testResults = [];
    this.serverProcess = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async startServer() {
    this.log('Starting Next.js development server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        shell: true
      });

      let serverReady = false;
      const timeout = setTimeout(() => {
        if (!serverReady) {
          this.log('Server startup timeout', 'error');
          this.serverProcess.kill();
          reject(new Error('Server startup timeout'));
        }
      }, 30000);

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Ready') || output.includes('started server')) {
          if (!serverReady) {
            serverReady = true;
            clearTimeout(timeout);
            this.log('Server started successfully', 'success');
            resolve();
          }
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      this.serverProcess.on('error', (error) => {
        clearTimeout(timeout);
        this.log(`Server error: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  async stopServer() {
    if (this.serverProcess) {
      this.log('Stopping server...');
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  async waitForServer() {
    this.log('Waiting for server to be ready...');
    
    for (let i = 0; i < 30; i++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/stats`);
        if (response.ok) {
          this.log('Server is ready', 'success');
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Server not ready after 30 seconds');
  }

  async testAPIEndpoint(endpoint, method = 'GET', body = null) {
    this.log(`Testing ${method} ${endpoint}...`);
    
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const data = await response.json();
      
      if (response.ok) {
        this.log(`✅ ${endpoint} - Status: ${response.status}`, 'success');
        return { success: true, data, status: response.status };
      } else {
        this.log(`❌ ${endpoint} - Status: ${response.status}, Error: ${data.error || 'Unknown error'}`, 'error');
        return { success: false, error: data.error, status: response.status };
      }
    } catch (error) {
      this.log(`❌ ${endpoint} - Network error: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async testStreakFunctionality() {
    this.log('🧪 Testing streak functionality...');
    
    const tests = [
      {
        name: 'Get initial streak status',
        endpoint: '/api/streak-status',
        method: 'GET'
      },
      {
        name: 'Get stats with streak data',
        endpoint: '/api/stats',
        method: 'GET'
      },
      {
        name: 'Test workout completion detection',
        endpoint: '/api/converse',
        method: 'POST',
        body: { message: 'I completed my workout today' }
      },
      {
        name: 'Test explicit workout completion',
        endpoint: '/api/converse',
        method: 'POST',
        body: { message: 'Workout is done' }
      },
      {
        name: 'Test training completion',
        endpoint: '/api/converse',
        method: 'POST',
        body: { message: 'Finished my training session' }
      }
    ];

    const results = [];
    
    for (const test of tests) {
      const result = await this.testAPIEndpoint(test.endpoint, test.method, test.body);
      results.push({
        name: test.name,
        ...result
      });
      
      // Wait a bit between requests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  async testWorkoutDetection() {
    this.log('🧪 Testing workout detection patterns...');
    
    const testMessages = [
      'I completed my workout today',
      'Workout is done',
      'Finished my training session',
      'Just finished exercising',
      'I did some exercise',
      'Training complete',
      'Workout done for today',
      'Exercise session complete',
      'Gym session finished'
    ];

    const results = [];
    
    for (const message of testMessages) {
      this.log(`Testing message: "${message}"`);
      
      const result = await this.testAPIEndpoint('/api/converse', 'POST', { message });
      results.push({
        message,
        ...result
      });
      
      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
  }

  async testRealTimeUpdates() {
    this.log('🧪 Testing real-time updates...');
    
    // This would require a more sophisticated test setup
    // For now, we'll test the API endpoints that support real-time updates
    const results = [];
    
    // Test stats endpoint multiple times to see if data changes
    for (let i = 0; i < 3; i++) {
      const result = await this.testAPIEndpoint('/api/stats');
      results.push({
        attempt: i + 1,
        ...result
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  async runAllTests() {
    this.log('🚀 Starting FitMemory Test Suite');
    this.log('================================');
    
    try {
      // Start the server
      await this.startServer();
      await this.waitForServer();
      
      // Run all test suites
      const streakResults = await this.testStreakFunctionality();
      const detectionResults = await this.testWorkoutDetection();
      const realTimeResults = await this.testRealTimeUpdates();
      
      // Compile results
      const allResults = {
        streak: streakResults,
        detection: detectionResults,
        realTime: realTimeResults
      };
      
      // Save results to file
      const resultsFile = path.join(process.cwd(), 'test-results.json');
      fs.writeFileSync(resultsFile, JSON.stringify(allResults, null, 2));
      
      this.log(`Test results saved to ${resultsFile}`, 'success');
      
      // Print summary
      this.printTestSummary(allResults);
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      throw error;
    } finally {
      await this.stopServer();
    }
  }

  printTestSummary(results) {
    this.log('\n📊 Test Summary');
    this.log('================');
    
    const totalTests = Object.values(results).flat().length;
    const successfulTests = Object.values(results).flat().filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    
    this.log(`Total tests: ${totalTests}`);
    this.log(`Successful: ${successfulTests}`, 'success');
    this.log(`Failed: ${failedTests}`, failedTests > 0 ? 'error' : 'success');
    
    if (failedTests > 0) {
      this.log('\n❌ Failed tests:');
      Object.values(results).flat()
        .filter(r => !r.success)
        .forEach(r => {
          this.log(`  - ${r.name || r.message}: ${r.error || 'Unknown error'}`);
        });
    }
  }
}

// Run the test suite
const tester = new FitMemoryTester();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down test suite...');
  await tester.stopServer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down test suite...');
  await tester.stopServer();
  process.exit(0);
});

// Run tests
tester.runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

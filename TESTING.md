# FitMemory Testing Guide

This guide explains how to test all functionality in the FitMemory application, with a focus on debugging the streak update issue.

## Quick Start

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Test Streak Functionality
```bash
# Simple streak test
npm run test:streak

# Comprehensive test suite
npm run test:all

# Debug streak specifically
npm run debug:streak
```

## Manual Testing Steps

### 1. Test Streak Updates

1. **Open the application** in your browser at `http://localhost:3000`

2. **Check initial streak status**:
   - Look at the streak display in the sidebar
   - Note the current streak number
   - Check the browser console for any errors

3. **Test workout completion**:
   - Send a message like "I completed my workout today"
   - Watch for:
     - Streak number increase in the UI
     - Console logs showing streak updates
     - Any notifications

4. **Verify streak persistence**:
   - Refresh the page
   - Check if the streak is still updated
   - Look at the streak grid to see today's workout marked

### 2. Test Different Workout Messages

Try these messages to test workout detection:

- "I completed my workout today"
- "Workout is done"
- "Finished my training session"
- "Just finished exercising"
- "Training complete"
- "Workout done for today"

### 3. Test Real-time Updates

1. **Open multiple browser tabs** with the application
2. **Complete a workout** in one tab
3. **Check if the streak updates** in the other tab automatically

## Debugging Streak Issues

### Common Issues and Solutions

#### 1. Streak Not Updating in UI

**Symptoms**: 
- Workout is logged but streak doesn't increase
- Streak number stays the same after workout completion

**Debug Steps**:
1. Open browser console (F12)
2. Look for console logs starting with 🔄, 📊, or 🔥
3. Check if `streakUpdate` is received in the API response
4. Verify the streak is actually saved to the database

**Solutions**:
- Check if the workout completion detection is working
- Verify the streak increment logic in `/api/converse`
- Ensure the UI is subscribed to real-time updates

#### 2. Streak Resets Unexpectedly

**Symptoms**:
- Streak goes back to 0
- "Streak Reset" notification appears

**Debug Steps**:
1. Check the `missedWorkouts` counter
2. Look at the `lastWorkoutDate` in the database
3. Verify the streak reset logic

**Solutions**:
- Adjust the `maxMissedDays` threshold
- Check the date calculation logic
- Verify the flexible mode settings

#### 3. Real-time Updates Not Working

**Symptoms**:
- Streak updates in one tab but not others
- UI doesn't reflect changes immediately

**Debug Steps**:
1. Check if `simpleRealTimeSync` is initialized
2. Verify component subscriptions
3. Look for WebSocket or polling errors

**Solutions**:
- Ensure all components are subscribed to updates
- Check the polling interval settings
- Verify the broadcast mechanism

## API Testing

### Test Individual Endpoints

```bash
# Test streak status
curl http://localhost:3000/api/streak-status

# Test stats
curl http://localhost:3000/api/stats

# Test workout completion
curl -X POST http://localhost:3000/api/converse \
  -H "Content-Type: application/json" \
  -d '{"message": "I completed my workout today"}'
```

### Expected Responses

#### `/api/streak-status`
```json
{
  "currentStreak": 5,
  "longestStreak": 10,
  "lastWorkoutDate": "2024-01-15T00:00:00.000Z",
  "missedWorkouts": 0,
  "flexibleMode": true,
  "streakHistory": [...]
}
```

#### `/api/converse` (with workout completion)
```json
{
  "reply": "Great job completing your workout!",
  "streakUpdate": {
    "currentStreak": 6,
    "longestStreak": 10,
    "isNewRecord": false
  },
  "workoutLogged": true
}
```

## Database Testing

### Check Streak Collection

```javascript
// In MongoDB shell or compass
db.streaks.findOne({_id: "local"})
```

### Reset Streak for Testing

```javascript
// Reset streak to 0
db.streaks.updateOne(
  {_id: "local"}, 
  {
    $set: {
      currentStreak: 0,
      lastWorkoutDate: null,
      missedWorkouts: 0
    }
  }
)
```

## Performance Testing

### Load Testing

```bash
# Test multiple concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/converse \
    -H "Content-Type: application/json" \
    -d '{"message": "Test workout '${i}'"}' &
done
```

### Memory Testing

```bash
# Monitor memory usage
npm run dev &
# Check memory usage in task manager
```

## Troubleshooting

### Common Error Messages

1. **"Database connection failed"**
   - Check MongoDB is running
   - Verify connection string
   - Check environment variables

2. **"Streak not found"**
   - Initialize streak record
   - Check database connection
   - Verify data persistence

3. **"Real-time sync failed"**
   - Check component subscriptions
   - Verify polling intervals
   - Check for JavaScript errors

### Debug Console Commands

```javascript
// Check current streak
fetch('/api/streak-status').then(r => r.json()).then(console.log)

// Force streak update
fetch('/api/converse', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({message: 'I completed my workout today'})
}).then(r => r.json()).then(console.log)

// Check stats
fetch('/api/stats').then(r => r.json()).then(console.log)
```

## Automated Testing

### Run All Tests

```bash
# Run comprehensive test suite
npm run test:all

# Run streak-specific tests
npm run test:streak

# Run debug session
npm run debug:streak
```

### Test Results

Test results are saved to:
- `test-results.json` - Comprehensive test results
- `debug-results.json` - Debug session results

## Best Practices

1. **Always test in development first**
2. **Use console logs for debugging**
3. **Test with different workout messages**
4. **Verify database persistence**
5. **Test real-time updates across tabs**
6. **Check error handling and fallbacks**

## Support

If you encounter issues:

1. Check the browser console for errors
2. Review the test results files
3. Check the database for data consistency
4. Verify all services are running
5. Test with different browsers/devices

For persistent issues, check:
- Network connectivity
- Database connection
- Environment variables
- Service dependencies

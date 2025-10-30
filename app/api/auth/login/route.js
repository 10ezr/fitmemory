import { NextResponse } from 'next/server';
import { verifyPassword, issueSession, setSessionCookies } from '@/lib/auth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    
    // If only password is provided (backwards compatibility)
    if (!username && password) {
      // Use the existing verifyPassword function
      if (!verifyPassword(password)) {
        // Add a small delay to prevent brute force attacks
        await new Promise(resolve => setTimeout(resolve, 1000));
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        );
      }
    }
    // If both username and password are provided
    else if (username && password) {
      const validUsername = process.env.AUTH_USERNAME || 'admin';
      
      // Check username and password
      if (username !== validUsername || !verifyPassword(password)) {
        // Add a small delay to prevent brute force attacks
        await new Promise(resolve => setTimeout(resolve, 1000));
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }
    }
    else {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    // Create session for authenticated user
    const user = { id: username || 'user', role: 'user' };
    const tokens = issueSession(user);
    
    const response = NextResponse.json(
      { success: true, message: 'Login successful' },
      { status: 200 }
    );
    
    // Set session cookies
    setSessionCookies(response, tokens);
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Logout endpoint
export async function DELETE(request) {
  try {
    const response = NextResponse.json(
      { success: true, message: 'Logout successful' },
      { status: 200 }
    );
    
    // Clear session cookies using the helper function
    const { clearSessionCookies } = require('@/lib/auth');
    clearSessionCookies(response);
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
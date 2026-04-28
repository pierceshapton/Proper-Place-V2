import { NextRequest, NextResponse } from 'next/server';

// Dummy handler for account deletion requests
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }
    // TODO: Implement backend call to delete user data by email
    // For now, just return a success message
    return NextResponse.json({ success: true, message: 'Account deletion request received.' });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}

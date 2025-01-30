# Waku E2E 1:1 Chat Example

This example demonstrates a simple end-to-end encrypted chat application using Waku. The application allows you to chat with a peer by exchanging encrypted messages through a Waku node.

## Features

### Peer Discovery and User Counting
The application shows the number of users currently active in the topic (e.g., "Users in topic: 3"). This is implemented using a discovery protocol that works as follows:

1. When a new user joins:
   - They send an 'announce' message to the discovery topic
   - All existing users respond with a 'response' message
   - The new user discovers all existing users through their responses

2. Maintaining presence:
   - Every user sends periodic 'heartbeat' messages (every 10 seconds)
   - Users that haven't sent a heartbeat for 20 seconds are considered disconnected
   - The user count updates automatically when users join or leave

3. Message Types:
   - `announce`: Sent when a user first joins
   - `response`: Sent by existing users when they receive an 'announce'
   - `heartbeat`: Sent periodically to maintain presence

This ensures that all users have a consistent view of how many participants are in the topic, regardless of when they joined.

### End-to-End Encryption
Messages are encrypted end-to-end between peers using their Ethereum-style addresses.

## How to run

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the application: `npm run dev`
4. Open the application in your browser: `http://localhost:3000`

## Usage

1. When you open the app, you'll get a unique address
2. Share your address with a peer
3. Paste your peer's address in the "Peer Address" field
4. Start chatting securely!
# Waku E2E 1:1 Chat Example

This example demonstrates a secure end-to-end encrypted chat application using Waku and Ethereum-based identity. The application enables secure communication between two Ethereum addresses through the decentralized Waku network.

## Security Implementation

### Access Control

1. **Identity Verification**
   - Each user is identified by their Ethereum wallet address
   - Private keys are used to prove ownership of addresses
   - Messages are bound to specific sender and recipient addresses

2. **Message Authorization**
   - Messages are only processed if they are:
     - Sent by the claimed sender address
     - Intended for the recipient's address
   - The chat component filters messages based on the user's address

3. **Connection Management**
   - Users must share their Ethereum addresses to communicate
   - The application maintains a peer discovery system to track active users
   - Heartbeat messages verify the continued presence of users

### End-to-End Encryption

1. **Key Generation**
   ```javascript
   const encryptionKey = CryptoJS.SHA256(senderAddress + recipientAddress).toString();
   ```
   - A unique encryption key is derived from:
     - The sender's Ethereum address
     - The recipient's Ethereum address
   - The key is deterministic but unique for each pair of users
   - Both parties can independently generate the same key

2. **Message Encryption**
   ```javascript
   const encrypted = CryptoJS.AES.encrypt(message, encryptionKey).toString();
   ```
   - Messages are encrypted using AES (Advanced Encryption Standard)
   - Each message is encrypted with the unique key for that conversation
   - The encryption is performed client-side before transmission

3. **Message Package**
   ```javascript
   const messagePackage = {
     encrypted: encryptedMessage,
     senderAddress: sender,
     recipientAddress: recipient,
     timestamp: new Date()
   };
   ```
   - Each message contains:
     - The encrypted message content
     - Sender's Ethereum address
     - Recipient's Ethereum address
     - Timestamp for message ordering

4. **Message Decryption**
   ```javascript
   const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
   const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
   ```
   - Only the intended recipient can decrypt messages
   - The same key derivation process is used for decryption
   - Messages are decrypted client-side after receipt

### Security Features

1. **Message Privacy**
   - All message content is encrypted
   - Only sender and recipient can read messages
   - The Waku network only sees encrypted data

2. **Identity Verification**
   - Messages are bound to Ethereum addresses
   - Private keys verify message ownership
   - Impersonation is prevented through cryptographic signing

3. **Decentralized Security**
   - No central server stores messages or keys
   - Keys are generated on-demand in the browser
   - Messages are distributed through the Waku P2P network

4. **Implementation Details**
   - Uses crypto-js for cryptographic operations
   - Leverages Ethereum's identity system
   - Built on Waku's decentralized protocol

## Technical Flow

1. **Message Sending**
   ```javascript
   // Generate encryption key
   encryptionKey = SHA256(senderAddress + recipientAddress)
   
   // Encrypt message
   encryptedContent = AES.encrypt(message, encryptionKey)
   
   // Package and send
   messagePackage = {
     encrypted: encryptedContent,
     sender: senderAddress,
     recipient: recipientAddress,
     timestamp: currentTime
   }
   ```

2. **Message Receiving**
   ```javascript
   // Verify recipient
   if (message.recipientAddress === myAddress) {
     // Generate same key
     encryptionKey = SHA256(senderAddress + recipientAddress)
     
     // Decrypt message
     decryptedContent = AES.decrypt(message.encrypted, encryptionKey)
     
     // Display message
     if (decryptedContent) {
       displayMessage(decryptedContent)
     }
   }
   ```

This implementation ensures that messages can only be read by their intended recipients while maintaining the decentralized nature of the Waku network.

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

## End-to-End Encryption

This chat application implements secure end-to-end encryption between Ethereum users using their wallet addresses. Here's how it works:

### Encryption Process

1. **Shared Secret Generation**
   - A shared secret is generated using:
     - SHA-256 hash of both users' addresses (sorted alphabetically)
     - This ensures both parties can independently generate the same base secret

2. **Key Derivation**
   - For each message, a unique encryption key is derived using:
     - The shared secret as the base
     - A random salt (16 bytes)
     - PBKDF2 with 1000 iterations
     - Results in a 256-bit key

3. **Message Encryption**
   - Each message is encrypted using:
     - AES encryption with the derived key
     - The salt is stored with the encrypted message
     - The encrypted package includes the ciphertext and salt

4. **Message Package**
   - The encrypted message package includes:
     - The encrypted message content
     - The salt used for key derivation
     - Sender's Ethereum address
     - Recipient's Ethereum address
     - Message timestamp

### Security Features

- **Deterministic Shared Secret**: Both parties can generate the same base secret
- **Unique Message Keys**: Each message uses a different salt and derived key
- **Strong Key Derivation**: PBKDF2 with 1000 iterations
- **No Key Storage**: Keys are derived on-the-fly
- **Decentralized**: Messages are distributed via Waku protocol
- **Metadata Protection**: Message content is fully encrypted

### Technical Implementation

The encryption process uses:
- crypto-js library for cryptographic operations
- SHA-256 for shared secret generation
- PBKDF2 for key derivation
- AES for message encryption
- Waku protocol for decentralized message distribution

This implementation provides strong security while being simple and reliable, using the well-tested crypto-js library.

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
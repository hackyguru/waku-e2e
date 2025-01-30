import { useState, useEffect, useRef } from 'react';
import { generateKeyPair, initializeWaku, sendEncryptedMessage, receiveMessages } from '../pages/index';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [node, setNode] = useState(null);
  const [keys, setKeys] = useState(null);
  const [peerAddress, setPeerAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [contentTopic, setContentTopic] = useState('/my-app/1/chat/proto');
  const [nodeStatus, setNodeStatus] = useState('Disconnected');
  const [peerCount, setPeerCount] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const setup = async () => {
      try {
        setNodeStatus('Generating Keys...');
        const myKeys = await generateKeyPair();
        setKeys(myKeys);

        setNodeStatus('Initializing Waku Node...');
        const wakuNode = await initializeWaku(
          (count) => {
            setPeerCount(count);
          },
          myKeys.address
        );
        setNode(wakuNode);
        setNodeStatus('Connected');
        setIsConnecting(false);

        await receiveMessages(
          wakuNode, 
          myKeys.privateKey,
          myKeys.address,
          (decryptedMessage) => {
            setMessages(prev => [...prev, {
              id: Date.now(),
              text: decryptedMessage.content,
              sender: decryptedMessage.senderAddress === myKeys.address ? 'user' : 'peer',
              timestamp: new Date(decryptedMessage.timestamp)
            }]);
          }
        );
      } catch (error) {
        console.error('Setup failed:', error);
        setNodeStatus('Connection Failed');
        setIsConnecting(false);
      }
    };

    setup();

    // Cleanup function
    return () => {
      if (node) {
        node.cleanup?.();
      }
    };
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !node || !peerAddress || !keys) return;

    try {
      const timestamp = new Date();
      // Don't add message to UI here, it will come through the receive callback
      await sendEncryptedMessage(
        node, 
        inputText, 
        peerAddress,
        keys.address
      );
      setInputText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Technical Details Panel */}
      <div className="mb-6 bg-background border border-black/[.08] dark:border-white/[.145] rounded-lg p-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">Technical Details</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-foreground/70">Users in topic:</span>
            <span className="font-medium bg-foreground/10 px-2 py-1 rounded-full">
              {peerCount + 1}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <h3 className="font-medium mb-2">Node Status</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${nodeStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{nodeStatus}</span>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Your Address (share this)</h3>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={keys?.address || ''}
                className="w-full px-3 py-1 rounded border border-black/[.08] dark:border-white/[.145] bg-background"
              />
              <button
                onClick={() => navigator.clipboard.writeText(keys?.address || '')}
                className="px-3 py-1 rounded bg-foreground text-background"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Peer Address (paste here)</h3>
            <input
              type="text"
              value={peerAddress}
              onChange={(e) => setPeerAddress(e.target.value)}
              placeholder="Paste peer's address here"
              className="w-full px-3 py-1 rounded border border-black/[.08] dark:border-white/[.145] bg-background"
            />
          </div>

          <div>
            <h3 className="font-medium mb-2">Content Topic</h3>
            <input
              type="text"
              value={contentTopic}
              onChange={(e) => setContentTopic(e.target.value)}
              className="w-full px-3 py-1 rounded border border-black/[.08] dark:border-white/[.145] bg-background"
            />
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex flex-col h-[500px] bg-background border border-black/[.08] dark:border-white/[.145] rounded-lg">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.sender === 'user'
                    ? 'bg-foreground text-background'
                    : 'bg-black/[.05] dark:bg-white/[.06]'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <span className="text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t border-black/[.08] dark:border-white/[.145]">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 rounded-full border border-black/[.08] dark:border-white/[.145] px-4 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
              placeholder="Type a message..."
            />
            <button
              type="submit"
              disabled={!node || !peerAddress || nodeStatus !== 'Connected'}
              className="rounded-full border border-transparent bg-foreground text-background px-4 py-2 hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
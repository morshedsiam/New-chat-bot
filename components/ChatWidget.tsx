import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageAuthor } from '../types';
import { sendMessageToN8n } from '../services/geminiService';

const PaperclipIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.59a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
);
const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);
const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
const BotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
);
const SpeakerOnIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
);
const SpeakerOffIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
);


const ChatWidget: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Effect to scroll to the latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    // Effect for creating a local URL for file previews
    useEffect(() => {
        if (attachedFile) {
            const url = URL.createObjectURL(attachedFile);
            setFilePreview(url);
            return () => URL.revokeObjectURL(url);
        }
        setFilePreview(null);
    }, [attachedFile]);

    // Effect to initialize and select a female voice for text-to-speech
    useEffect(() => {
      const handleVoicesChanged = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return; // Voices not loaded yet

        const femaleVoice =
            // Prioritize high-quality, explicitly female, US English voices
            voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('female')) ||
            // Then, any English voice that identifies as female
            voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
            // Fallback to known female voice names which might not include "female"
            voices.find(v => v.lang.startsWith('en') && ['susan', 'samantha', 'zira', 'tessa', 'google uk english female'].some(name => v.name.toLowerCase().includes(name))) ||
            // As a last resort, take the first available US English voice
            voices.find(v => v.lang === 'en-US') ||
            // Or any English voice
            voices.find(v => v.lang.startsWith('en'));

        if (femaleVoice) {
          setVoice(femaleVoice);
        }
      };

      // Voices can load asynchronously. We check immediately and also set up a listener.
      handleVoicesChanged();
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
      return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, []);

    // Effect to speak the latest AI message
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.author === MessageAuthor.AI && !isMuted && voice) {
            window.speechSynthesis.cancel(); // Stop any previous speech
            const utterance = new SpeechSynthesisUtterance(lastMessage.text);
            utterance.voice = voice;
            window.speechSynthesis.speak(utterance);
        }
    }, [messages, isMuted, voice]);


    const handleSendMessage = async () => {
        const trimmedInput = inputValue.trim();
        if (!trimmedInput && !attachedFile) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: trimmedInput,
            author: MessageAuthor.USER,
        };

        if (attachedFile && filePreview) {
            userMessage.file = {
                name: attachedFile.name,
                type: attachedFile.type,
                url: filePreview,
            };
        }

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setAttachedFile(null);
        setIsLoading(true);

        try {
            const response = await sendMessageToN8n(trimmedInput, attachedFile ?? undefined);
            const aiMessage: Message = {
                id: Date.now().toString() + '-ai',
                text: response.text,
                author: MessageAuthor.AI,
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Failed to send message:", error);
            const errorMessage: Message = {
                id: Date.now().toString() + '-error',
                text: "Sorry, something went wrong. Please try again.",
                author: MessageAuthor.AI,
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setAttachedFile(event.target.files[0]);
        }
    };
    
    const handleRemoveFile = () => {
        setAttachedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    
    const canSend = !isLoading && (inputValue.trim() || attachedFile);

    return (
        <div className="flex flex-col h-full bg-white/50 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-200/50 border border-white/30">
            <header className="p-4 rounded-t-3xl bg-gradient-to-r from-purple-500 to-pink-500 text-white flex justify-between items-center shadow-lg">
                <div>
                    <h2 className="text-xl font-bold">Nathan AI</h2>
                    <p className="text-sm opacity-80">Your n8n workflow assistant</p>
                </div>
                 <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                    {isMuted ? <SpeakerOffIcon className="w-6 h-6" /> : <SpeakerOnIcon className="w-6 h-6" />}
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-rose-50 custom-scrollbar">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.author === MessageAuthor.USER ? 'justify-end' : 'justify-start'}`}>
                       {msg.author === MessageAuthor.AI && (
                           <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                               <BotIcon className="w-5 h-5 text-purple-600" />
                           </div>
                       )}
                        <div className={`rounded-2xl px-4 py-2 max-w-sm shadow-md ${msg.author === MessageAuthor.USER ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-br-lg' : 'bg-white text-gray-800 rounded-bl-lg'}`}>
                            {msg.file && (
                                <div className="mb-2">
                                    {msg.file.type.startsWith('image/') ? (
                                        <img src={msg.file.url} alt={msg.file.name} className="max-w-xs max-h-48 rounded-md" />
                                    ) : (
                                        <div className="bg-gray-100 p-2 rounded-md text-sm text-gray-700 flex items-center gap-2">
                                            <PaperclipIcon className="w-4 h-4" />
                                            <span>{msg.file.name}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-end gap-2 justify-start">
                         <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                               <BotIcon className="w-5 h-5 text-purple-600" />
                           </div>
                        <div className="rounded-2xl px-4 py-2 bg-white text-gray-800 rounded-bl-lg shadow-md">
                            <div className="flex items-center space-x-1">
                                <span className="w-2 h-2 bg-purple-300 rounded-full animate-pulse delay-0"></span>
                                <span className="w-2 h-2 bg-purple-300 rounded-full animate-pulse delay-150"></span>
                                <span className="w-2 h-2 bg-purple-300 rounded-full animate-pulse delay-300"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-3 border-t border-white/30 bg-white/60 rounded-b-3xl">
                {attachedFile && filePreview && (
                    <div className="mb-2 p-2 bg-purple-50 rounded-xl flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 overflow-hidden">
                            {attachedFile.type.startsWith('image/') ? (
                                <img src={filePreview} alt="preview" className="w-10 h-10 rounded-lg object-cover" />
                            ) : <PaperclipIcon className="w-6 h-6 text-purple-600" />}
                            <span className="truncate text-purple-800">{attachedFile.name}</span>
                        </div>
                        <button onClick={handleRemoveFile} className="text-purple-500 hover:text-purple-800 p-1 rounded-full hover:bg-purple-100">
                           <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer text-gray-500 hover:text-pink-500 p-2 rounded-full hover:bg-pink-50 transition-colors">
                       <PaperclipIcon className="w-6 h-6" />
                    </label>
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="Type a message..."
                        className="flex-1 p-2 bg-white/0 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none placeholder-gray-400"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!canSend}
                        className={`p-3 rounded-full text-white transition-all duration-300 transform ${canSend ? 'bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-110 shadow-lg' : 'cursor-not-allowed bg-gray-300'}`}
                    >
                        <SendIcon className="w-6 h-6" />
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default ChatWidget;
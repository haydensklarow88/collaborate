
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from '@/api/entities';
import { Thread } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Stethoscope, Pill, Loader2, CheckCircle, XCircle } from 'lucide-react';
// Badge import is kept but the component is removed from JSX as per request
import { Badge } from '@/components/ui/badge'; 
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Notification } from '@/api/entities';
import { User as UserEntity } from '@/api/entities';
import { MedicationRequest } from '@/api/entities';
import { formatESTTime } from '@/components/utils/datetime';

const StockCheckResponseCard = ({ message, onRespond }) => {
    const request = message.payload;
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const medication = request.medications && request.medications[0];

    const handleResponse = async (status) => {
        setIsSending(true);
        await onRespond(message.id, { [medication.id]: status });
        setIsSent(true);
        setIsSending(false);
    };

    if (!medication) return null;

    const medName = (medication.brand_name || medication.generic_name || 'Medication');
    const detailsLine = [medication.dosage, medication.form].filter(Boolean).join(' ');

    return (
        <Card className="my-2 bg-blue-50 border-blue-200">
            <CardHeader className="p-4">
                <CardTitle className="text-base">Stock Check Request</CardTitle>
                 <p className="text-sm text-gray-600 break-words">From: {message.author_name || 'Prescriber'}</p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="p-3 bg-white rounded-lg border mb-4">
                    <p className="font-bold text-lg text-gray-800 break-words">{medName}</p>
                    {detailsLine && <p className="text-sm text-gray-600 break-words">{detailsLine}</p>}
                    {typeof medication.quantity !== 'undefined' && medication.quantity !== null && (
                        <p className="text-sm text-gray-500">Quantity: {String(medication.quantity)}</p>
                    )}
                </div>
                 <p className="text-sm font-medium mb-2 text-center">Is this medication currently in stock?</p>
                <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => handleResponse('Yes')} disabled={isSending || isSent} size="lg" className="bg-green-600 hover:bg-green-700"><CheckCircle className="w-5 h-5 mr-2" /> Yes, In Stock</Button>
                    <Button onClick={() => handleResponse('No')} disabled={isSending || isSent} size="lg" variant="destructive"><XCircle className="w-5 h-5 mr-2" /> No, Out of Stock</Button>
                </div>
                {isSent && <p className="text-center text-green-700 text-sm mt-3 font-semibold">Response sent!</p>}
            </CardContent>
        </Card>
    );
};

const ChatBubble = ({ msg, onRespond }) => {
    const isPharmacy = msg.author === 'pharmacy';

    if (msg.payload?.type === 'stock_check_request') {
        return <StockCheckResponseCard message={msg} onRespond={onRespond} />;
    }

    if (msg.payload?.type === 'availability_response') {
        return (
            <div className="text-center my-3">
                 <p className="text-xs text-gray-500 italic bg-gray-100 rounded-full px-4 py-1.5 inline-block shadow-sm">
                    <CheckCircle className="w-4 h-4 mr-2 inline-block text-green-600" />
                    You responded to the stock check.
                </p>
            </div>
        );
    }

    const messageTime = formatESTTime(msg.created_date);

    return (
        <div className={`flex items-start gap-2 my-2 ${isPharmacy ? 'justify-end' : ''}`}>
            {!isPharmacy && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-4 h-4 text-blue-700" />
              </div>
            )}

            <div className="flex flex-col max-w-[80%] min-w-0">
                <div className={`p-3 rounded-lg text-sm whitespace-pre-wrap break-words shadow-sm ${isPharmacy ? 'bg-green-600 text-white' : 'bg-white border border-gray-200'}`}>
                    {msg.body || ''}
                </div>
                <span className={`text-xs text-gray-500 mt-1 ${isPharmacy ? 'text-right' : 'text-left'}`}>
                    {messageTime}
                </span>
            </div>

            {isPharmacy && (
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Pill className="w-4 h-4 text-green-700" />
              </div>
            )}
        </div>
    );
};

export default function ThreadDetailView({ thread, onBack }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [currentThread, setCurrentThread] = useState(thread);
    const [lastLoadTime, setLastLoadTime] = useState(0);
    const messagesEndRef = useRef(null);

    // Ref to hold the current messages array without being a dependency of useCallback
    const messagesRef = useRef(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Memoize playNotificationSound to ensure it's stable across renders
    const playNotificationSound = useCallback(() => {
        try {
            const audio = new Audio('/bell.mp3'); // Assuming bell.mp3 is in the public folder
            audio.volume = 0.5; // Adjust volume as needed
            audio.play().catch(e => console.warn('Failed to play notification sound:', e));
        } catch (e) {
            console.warn('Error creating or playing audio:', e);
        }
    }, []); // No dependencies, so it's stable

    const loadData = useCallback(async () => {
        if (!currentThread) return;

        // Rate limiting protection - minimum 3 seconds between loads
        const now = Date.now();
        if (now - lastLoadTime < 3000) {
            return;
        }

        setLastLoadTime(now);
        const previousMessages = messagesRef.current; // Get the latest messages from ref

        if (messagesRef.current.length === 0) setIsLoading(true);

        try {
            const [fetchedMessages, fetchedThread] = await Promise.all([
                Message.filter({ thread_id: currentThread.id }, 'created_date'),
                Thread.get(currentThread.id)
            ]);
            setMessages(fetchedMessages);
            setCurrentThread(fetchedThread);

            // Mark as read for pharmacy when viewing thread
            if (fetchedThread && !fetchedThread.pharmacy_read) {
              await Thread.update(fetchedThread.id, { pharmacy_read: true });
            }

            // Bell sound logic: Play if new messages arrived from prescriber during a poll
            if (fetchedMessages.length > previousMessages.length) {
                const newPrescriberMessages = fetchedMessages.filter(
                    // Filter for messages not authored by 'pharmacy' AND not present in previousMessages
                    msg => msg.author !== 'pharmacy' && !previousMessages.some(prevMsg => prevMsg.id === msg.id)
                );
                if (newPrescriberMessages.length > 0) {
                    playNotificationSound();
                }
            }

        } catch (error) {
            if (error.message?.includes('Rate limit exceeded')) {
                console.warn('Rate limit hit in thread detail, backing off');
                // Back off for 30 seconds on rate limit
                setTimeout(() => setLastLoadTime(0), 30000);
            } else {
                console.error('Failed to load thread data:', error);
            }
        } finally {
            setIsLoading(false);
        }
    }, [currentThread, lastLoadTime, playNotificationSound]);

    useEffect(() => {
        loadData();
        // Reduce polling frequency to 15 seconds
        const interval = setInterval(loadData, 15000);
        return () => clearInterval(interval);
    }, [loadData]);

    useEffect(scrollToBottom, [messages]);

    const handleSendStockResponse = async (requestId, responses) => {
        if (isSending) return;
        setIsSending(true);

        try {
            const responsePayload = { type: 'availability_response', request_id: requestId, responses };

            await Message.create({
                thread_id: currentThread.id,
                author: 'pharmacy',
                author_name: currentThread.pharmacy_name,
                body: 'Stock status updated.',
                payload: responsePayload
            });

            if (currentThread.prescriber_email) {
                const title = `Response from ${currentThread.pharmacy_name || 'Pharmacy'}`;
                const body = currentThread.reference_number
                  ? `Ref #${currentThread.reference_number}: Response available for a recent stock check.`
                  : `Response available for a recent stock check.`;

                await Notification.create({
                    user_email: currentThread.prescriber_email,
                    recipient_role: 'prescriber',
                    title,
                    body,
                    link_to_thread_id: currentThread.id
                });
            }

            await Thread.update(currentThread.id, { status: 'answered', prescriber_read: false });

            // Update MedicationRequest aggregate status
            if (currentThread.medication_request_id) {
              const mr = await MedicationRequest.get(currentThread.medication_request_id);
              const updated = { ...mr };
              const medId = Object.keys(responses || {})[0];
              const isYes = responses[medId] === 'Yes';
              updated.pharmacy_responses = (mr.pharmacy_responses || []).map((r) =>
                r.thread_id === currentThread.id
                  ? { ...r, status: isYes ? 'in_stock' : 'out_of_stock', response_date: new Date().toISOString() }
                  : r
              );
              const anyYes = updated.pharmacy_responses.some(r => r.status === 'in_stock');
              const allNo = updated.pharmacy_responses.length > 0 && updated.pharmacy_responses.every(r => r.status !== 'pending' && r.status !== 'in_stock');
              updated.status = anyYes ? 'has_in_stock' : (allNo ? 'no_stock' : 'pending');
              await MedicationRequest.update(mr.id, {
                pharmacy_responses: updated.pharmacy_responses,
                status: updated.status
              });
            }

            // Wait a bit before reloading to avoid rate limits
            setTimeout(() => {
                setLastLoadTime(0);
                loadData();
            }, 2000);
        } catch (error) {
            console.error('Failed to send stock response:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentThread || isSending) return;
        setIsSending(true);

        try {
            await Message.create({
                thread_id: currentThread.id,
                author: 'pharmacy',
                author_name: currentThread?.pharmacy_name || 'Pharmacy',
                body: newMessage,
            });

            if (currentThread.prescriber_email) {
                const title = `Message from ${currentThread?.pharmacy_name || 'Pharmacy'}`;
                const body = currentThread.reference_number
                  ? `Ref #${currentThread.reference_number}: New message regarding a stock check.`
                  : `New message regarding a stock check.`;

                await Notification.create({
                    user_email: currentThread.prescriber_email,
                    recipient_role: 'prescriber',
                    title,
                    body,
                    link_to_thread_id: currentThread.id
                });
            }

            await Thread.update(currentThread.id, { status: 'answered', prescriber_read: false });
            setNewMessage('');

            // Wait before reloading
            setTimeout(() => {
                setLastLoadTime(0);
                loadData();
            }, 2000);
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (!currentThread) return null;

    const headerPractice = currentThread.prescriber_practice_name || 'Prescriber';

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg h-[80vh] flex flex-col">
            <header className="p-4 border-b flex items-center gap-3 bg-gray-50 rounded-t-lg">
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">Chat with <span className="truncate inline-block align-bottom max-w-[70%]">{headerPractice}</span></h3>
                    {currentThread.reference_number && (
                      <p className="text-sm text-gray-500 truncate">Ref #: {currentThread.reference_number}</p>
                    )}
                </div>
                {/* Removed Badge component as per request */}
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map(msg => <ChatBubble key={msg.id} msg={msg} onRespond={handleSendStockResponse} />)}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 border-t bg-gray-50 rounded-b-lg">
                <div className="flex items-end gap-3">
                    <Textarea
                        placeholder="Type your message to the prescriber..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                        className="resize-none min-h-[60px] text-base"
                        rows={2}
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isSending} className="px-6 py-3">
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
            </footer>
        </div>
    );
}


import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, MessageSquare, Loader2, User, Clock } from 'lucide-react';
import { Thread } from '@/api/entities';
import { Message } from '@/api/entities';
import { User as UserEntity } from '@/api/entities';
import { Notification } from '@/api/entities';

const mockPrescribers = [
  { id: '1', name: 'Stone Ridge Dermatology', email: 'dr.smith@realtimerx.org', specialty: 'Dermatology', isOnline: true, lastSeen: new Date() },
  { id: '2', name: 'City Hospital Pediatrics', email: 'dr.jones@realtimerx.org', specialty: 'Pediatrics', isOnline: false, lastSeen: new Date(Date.now() - 3600000) }, // 1 hour ago
  { id: '3', name: 'Coastal Cardiology', email: 'dr.davis@realtimerx.org', specialty: 'Cardiology', isOnline: true, lastSeen: new Date() },
  { id: '4', name: 'Green Valley Family Care', email: 'dr.williams@realtimerx.org', specialty: 'Family Medicine', isOnline: true, lastSeen: new Date() },
  { id: '5', name: 'Summit Orthopedics', email: 'dr.brown@realtimerx.org', specialty: 'Orthopedics', isOnline: false, lastSeen: new Date(Date.now() - 7200000) }, // 2 hours ago
  { id: '6', name: 'Rivertown Neurology', email: 'dr.garcia@realtimerx.org', specialty: 'Neurology', isOnline: true, lastSeen: new Date() },
  { id: '7', name: 'Desert Hills Endocrinology', email: 'dr.rodriguez@realtimerx.org', specialty: 'Endocrinology', isOnline: false, lastSeen: new Date(Date.now() - 10800000) }, // 3 hours ago
  { id: '8', name: 'Lakeview Oncology', email: 'dr.martinez@realtimerx.org', specialty: 'Oncology', isOnline: true, lastSeen: new Date() },
  { id: '9', name: 'Mountain View Psychiatry', email: 'dr.hernandez@realtimerx.org', specialty: 'Psychiatry', isOnline: false, lastSeen: new Date(Date.now() - 14400000) }, // 4 hours ago
  { id: '10', name: 'Urban Urgent Care', email: 'dr.lopez@realtimerx.org', specialty: 'Urgent Care', isOnline: true, lastSeen: new Date() },
];

const PrescriberCard = ({ prescriber, onStartChat, isStartingChat }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${prescriber.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <div>
                <h4 className="font-semibold">{prescriber.name}</h4>
                <p className="text-sm text-gray-500">{prescriber.specialty}</p>
            </div>
        </div>
        <Button onClick={() => onStartChat(prescriber)} disabled={isStartingChat} className="bg-green-600 hover:bg-green-700">
            {isStartingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
        </Button>
      </CardContent>
    </Card>
);

export default function PrescriberDirectory({ onBack, onSelectThread }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [prescribers, setPrescribers] = useState(mockPrescribers);

  const filteredPrescribers = prescribers.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartChat = async (prescriber) => {
    setIsStartingChat(true);
    let pharmacyName = 'Stone Ridge Pharmacy';
    try {
      const me = await UserEntity.me();
      if (me?.pharmacy_name) pharmacyName = me.pharmacy_name;
    } catch (_) {
      // Unauthenticated: proceed with default pharmacyName
    }
    try {
      const thread = await Thread.create({
        prescriber_email: prescriber.email,
        prescriber_practice_name: prescriber.name,
        pharmacy_name: pharmacyName,
        status: 'in_progress',
        initiated_by: 'pharmacy',
      });
      await Notification.create({
        user_email: prescriber.email,
        recipient_role: 'prescriber',
        title: `New Message from ${pharmacyName}`,
        body: 'A new chat has been started.',
        link_to_thread_id: thread.id,
      });
      onSelectThread(thread);
    } catch (error) {
      console.error('Failed to start chat:', error);
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <CardTitle>Contact a Prescriber</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredPrescribers.map((prescriber) => (
            <PrescriberCard key={prescriber.id} prescriber={prescriber} onStartChat={handleStartChat} isStartingChat={isStartingChat} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

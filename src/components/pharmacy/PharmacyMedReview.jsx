import React, { useState, useEffect } from 'react';
import { Thread } from '@/api/entities';
import { Message } from '@/api/entities';
import { PendingERx } from '@/api/entities/PendingERx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Clock, CheckCircle, XCircle, HelpCircle, Send, Loader2, DollarSign, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '@/api/entities';

const DetailedMedCard = ({ med, medData, responses, setResponses, notes, setNotes, isSent }) => {
  const response = responses[med.id];
  const note = notes[med.id] || '';

  const handleResponse = (status) => {
    setResponses(prev => ({ ...prev, [med.id]: status }));
  };

  const handleNote = (value) => {
    setNotes(prev => ({ ...prev, [med.id]: value }));
  };

  return (
    <div className="p-3 bg-gray-50 rounded border mb-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium text-gray-900">{med.medication_name} {med.dosage} {med.form}</h4>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={response === 'Yes' ? 'default' : 'outline'}
            onClick={() => handleResponse('Yes')}
            className="h-6 text-xs px-2"
            disabled={isSent}
          >
            Yes
          </Button>
          <Button
            size="sm"
            variant={response === 'No' ? 'destructive' : 'outline'}
            onClick={() => handleResponse('No')}
            className="h-6 text-xs px-2"
            disabled={isSent}
          >
            No
          </Button>
          <Button
            size="sm"
            variant={response === 'Need Info' ? 'secondary' : 'outline'}
            onClick={() => handleResponse('Need Info')}
            className="h-6 text-xs px-2"
            disabled={isSent}
          >
            Info
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs mb-2">
        <div className="flex items-center gap-1">
          <DollarSign className="w-3 h-3 text-green-600" />
          <span className="font-medium">RTBP:</span>
          <span className="text-green-700">${medData?.rtbp_generic} / ${medData?.rtbp_brand}</span>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-blue-600" />
          <span className="font-medium">PA:</span>
          <Badge
            variant={medData?.pa_status === 'Required' ? 'destructive' : 'secondary'}
            className="text-xs px-1 py-0"
          >
            {medData?.pa_status}
          </Badge>
        </div>
      </div>

      {medData?.pbm_notes && (
        <div className="text-xs text-gray-600 mb-2 p-2 bg-yellow-50 rounded">
          <strong>PBM Notes:</strong> {medData.pbm_notes}
        </div>
      )}

      <Textarea
        placeholder="Optional note..."
        value={note}
        onChange={(e) => handleNote(e.target.value)}
        className="text-xs h-16 resize-none"
        disabled={isSent}
      />
    </div>
  );
};

const DetailedRequestCard = ({ thread, medications, onUpdate }) => {
  const [responses, setResponses] = useState({});
  const [notes, setNotes] = useState({});
  const [medData, setMedData] = useState({});
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    loadMedData();
  }, [medications]);

  const loadMedData = async () => {
    const pendingMeds = await PendingERx.list();
    const dataMap = pendingMeds.reduce((acc, med) => {
      acc[med.id] = med;
      return acc;
    }, {});
    setMedData(dataMap);
  };

  const handleBatchResponse = (status) => {
    const batchResponses = {};
    medications.forEach(med => {
      batchResponses[med.id] = status;
    });
    setResponses(batchResponses);
  };

  const handleSendResult = async () => {
    setIsSending(true);

    const responseItems = medications.map(med => {
      const status = responses[med.id] || 'Not answered';
      const data = medData[med.id];
      const note = notes[med.id];

      let item = `• ${med.medication_name} ${med.dosage} — ${status}`;

      if (status === 'Yes' && data) {
        item += ` (RTBP: $${data.rtbp_generic}/$${data.rtbp_brand}, PA: ${data.pa_status})`;
      }

      if (note) {
        item += ` (${note})`;
      }

      return item;
    }).join('\n');

    const finalMessage = `Detailed pharmacy reply — ${thread.patient_alias}\n${responseItems}`;

    await Message.create({
      thread_id: thread.id,
      author: 'pharmacy',
      body: finalMessage,
      payload: {
        type: 'detailed_availability_response',
        responses: responses,
        notes: notes,
        medData: medData
      }
    });

    // Notify prescriber
    if (thread.prescriber_email) {
      await Notification.create({
        user_email: thread.prescriber_email,
        title: `Detailed response from ${thread.pharmacy_name}`,
        body: `Complete review for ${thread.patient_alias} is ready.`,
        link_to_thread_id: thread.id
      });
    }

    const hasNeedInfo = Object.values(responses).some(r => r === 'Need Info');
    const newStatus = hasNeedInfo ? 'need_info' : 'answered';

    await Thread.update(thread.id, { status: newStatus });
    setIsSent(true);
    setIsSending(false);

    setTimeout(() => {
      onUpdate();
    }, 2000);
  };

  const timeAgo = formatDistanceToNow(new Date(thread.created_date), { addSuffix: true });
  const allResponded = medications.every(med => responses[med.id]);

  return (
    <Card className="mb-4 border-l-4 border-l-purple-500">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-4">
            <div>
              <span className="font-semibold text-gray-800">Patient: {thread.patient_alias}</span>
              <span className="mx-2 text-gray-400">|</span>
              <span className="text-gray-600">{thread.prescriber_email}</span>
            </div>
            <Badge variant="secondary">Detailed Review</Badge>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            {timeAgo}
          </div>
        </div>

        <div className="space-y-1 mb-4">
          {medications.map(med => (
            <DetailedMedCard
              key={med.id}
              med={med}
              medData={medData[med.id]}
              responses={responses}
              setResponses={setResponses}
              notes={notes}
              setNotes={setNotes}
              isSent={isSent}
            />
          ))}
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchResponse('Yes')}
              disabled={isSent}
            >
              All Yes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchResponse('No')}
              disabled={isSent}
            >
              All No
            </Button>
          </div>
          <Button
            onClick={handleSendResult}
            disabled={!allResponded || isSending || isSent}
            className={isSent ? "bg-green-600 hover:bg-green-600" : ""}
          >
            {isSending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isSent && <CheckCircle className="w-4 h-4 mr-2" />}
            {isSent ? "Response Sent" : "Send Result"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function PharmacyMedReview({ onSelectThread }) {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDetailedRequests();
    const interval = setInterval(loadDetailedRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDetailedRequests = async () => {
    setIsLoading(true);

    const activeThreads = await Thread.filter(
      { status: ['pending', 'in_progress'] },
      '-created_date'
    );

    const requestsWithMeds = await Promise.all(
      activeThreads.map(async (thread) => {
        const messages = await Message.filter(
          { thread_id: thread.id, payload: { type: 'availability_batch' } },
          'created_date',
          1
        );
        const medications = messages[0]?.payload?.meds || [];
        return { thread, medications };
      })
    );

    setRequests(requestsWithMeds.filter(req => req.medications.length > 0));
    setIsLoading(false);
  };

  const handleUpdate = () => {
    loadDetailedRequests();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Detailed Reviews ({requests.length})</h3>
      </div>

      {requests.length > 0 ? (
        requests.map(({ thread, medications }) => (
          <DetailedRequestCard
            key={thread.id}
            thread={thread}
            medications={medications}
            onUpdate={handleUpdate}
          />
        ))
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Detailed Reviews</h3>
          <p className="text-gray-500">Complex medication reviews will appear here</p>
        </div>
      )}
    </div>
  );
}
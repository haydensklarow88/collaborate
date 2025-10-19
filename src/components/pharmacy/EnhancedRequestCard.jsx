
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, HelpCircle, Send, Loader2, AlertTriangle, DollarSign, Shield, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Message } from '@/api/entities';
import { Thread } from '@/api/entities';
import { Notification } from '@/api/entities';
import { EPA } from '@/api/entities/EPA';

// Cache for RTPB data to prevent repeated API calls
const rtbpCache = new Map();

// Generate a static price for the session (This was in original code, but not explicitly in outline for removal/change. Keeping for now.)
const staticGoodRxPrice = (Math.random() * 30 + 10).toFixed(2);

const RTBPMedicationCard = ({ med, rtbpData, responses, setResponses, isSent, onCreateEPA }) => {
  const [epaCreated, setEpaCreated] = useState(false); // Changed from isEPAPending
  const response = responses[med.id];
  
  const handleResponse = (status) => {
    setResponses(prev => ({ ...prev, [med.id]: status }));
  };

  const handleCreateEPA = () => {
    if (rtbpData?.prior_auth_required) {
      onCreateEPA(med, rtbpData);
      setEpaCreated(true); // Changed from setIsEPAPending(true)
    }
  };

  return (
    <div className="border rounded-lg p-3 bg-white space-y-3">
      {/* Medication Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">
            {med.brandName || med.medicationName || med.medication_name} {med.dosage} {med.form}
          </h4>
          <p className="text-sm text-gray-500">Qty: {med.quantity}</p>
          {med.instructions && (
            <p className="text-xs text-gray-500 mt-1">{med.instructions}</p>
          )}
        </div>
        
        {/* Stock Response Buttons */}
        <div className="flex gap-1 ml-4">
          <Button
            size="sm"
            variant={response === 'Yes' ? 'default' : 'outline'}
            onClick={() => handleResponse('Yes')}
            className="h-7 text-xs"
            disabled={isSent}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Yes
          </Button>
          <Button
            size="sm"
            variant={response === 'No' ? 'destructive' : 'outline'}
            onClick={() => handleResponse('No')}
            className="h-7 text-xs"
            disabled={isSent}
          >
            <XCircle className="w-3 h-3 mr-1" />
            No
          </Button>
          <Button
            size="sm"
            variant={response === 'Low Stock' ? 'secondary' : 'outline'} // Variant change applied
            onClick={() => handleResponse('Low Stock')}
            className="h-7 text-xs"
            disabled={isSent}
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Low Stock
          </Button>
          <Button
            size="sm"
            variant={response === 'Need Info' ? 'secondary' : 'outline'} // Variant change applied
            onClick={() => handleResponse('Need Info')}
            className="h-7 text-xs"
            disabled={isSent}
          >
            <HelpCircle className="w-3 h-3 mr-1" />
            Info
          </Button>
        </div>
      </div>

      {/* RTPB Info */}
      <div className="border-t pt-2 space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {/* Cost Information */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="font-medium">Copay:</span>
            <span>${rtbpData?.copay || 'N/A'}</span>
          </div>
          {/* Tier Information */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="font-medium">Tier:</span>
            <span>{rtbpData?.tier || 'N/A'}</span>
          </div>
        </div>

        {/* Authorization Requirements */}
        {rtbpData?.prior_auth_required && (
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-600" />
            <span className="text-red-700 font-medium">Prior Authorization Required</span>
            <Button
              size="sm"
              variant={epaCreated ? "secondary" : "outline"} // Changed from isEPAPending
              className={`h-7 text-xs ${epaCreated ? 'text-gray-500' : 'text-red-600 border-red-300'}`} // Changed from isEPAPending
              onClick={handleCreateEPA}
              disabled={epaCreated} // Changed from isEPAPending
            >
              {epaCreated ? 'Pending...' : 'Create EPA'} {/* Changed from isEPAPending */}
            </Button>
          </div>
        )}
        {rtbpData?.step_therapy_required && (
            <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <span className="text-orange-700 font-medium">Step Therapy Required</span>
            </div>
        )}

        {/* Alternatives */}
        {rtbpData?.alternatives && rtbpData.alternatives.length > 0 && (
          <div className="text-blue-600">
            Alt: {rtbpData.alternatives[0].medication_name} (${rtbpData.alternatives[0].copay})
          </div>
        )}
      </div>
    </div>
  );
};

export default function EnhancedRequestCard({ thread, medications, onUpdate, requestId, patientData }) {
  const [responses, setResponses] = useState({});
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [rtbpData, setRtbpData] = useState({}); // Changed casing from setRTBPData and removed isLoadingRTBP

  // Removed isAcknowledged state as per outline. Logic will rely on thread.status directly.

  useEffect(() => {
    const fetchRTBP = async (med) => {
      const cacheKey = med.id; // Cache by individual medication ID
      if (rtbpCache.has(cacheKey)) {
        setRtbpData(prev => ({ ...prev, [cacheKey]: rtbpCache.get(cacheKey) }));
        return;
      }
      try {
        // Generate simple mock data instead of calling LLM API
        const mockRTBP = {
          copay: Math.floor(Math.random() * 50) + 10, // $10-$60
          tier: `Tier ${Math.floor(Math.random() * 3) + 1}`, // Tier 1-3
          prior_auth_required: Math.random() < 0.4, // 40% chance (increased slightly from original)
          step_therapy_required: Math.random() < 0.2, // 20% chance
          // Added quantity_limit as it was in original but not in outline's mock, keeping it for completeness if not explicitly removed.
          quantity_limit: Math.random() < 0.4 ? "30 tabs / 30 days" : null, 
          alternatives: Math.random() < 0.6 ? [ // 60% chance for an alternative
            {
              medication_name: `Generic for ${med.brandName || med.medicationName || med.medication_name}`,
              copay: Math.floor(Math.random() * 20) + 5
            }
          ] : []
        };
        rtbpCache.set(cacheKey, mockRTBP);
        setRtbpData(prev => ({ ...prev, [cacheKey]: mockRTBP })); // Update state for this specific medication
      } catch (error) {
        console.error("Failed to fetch RTBP", error);
        // On error, still update with empty data for this med to avoid re-fetching
        setRtbpData(prev => ({ ...prev, [cacheKey]: {} }));
      }
    };

    medications.forEach(fetchRTBP); // Fetch RTBP data for each medication
  }, [medications]); // Depend on medications to refetch if they change

  const handleCreateEPA = async (medication, rtbpInfo) => {
    try {
      const epa = await EPA.create({
        thread_id: thread.id,
        medication_name: medication.medicationName || medication.medication_name,
        patient_alias: thread.patient_alias,
        prescriber_email: thread.prescriber_email,
        status: 'pending'
      });

      // Send EPA notification to prescriber
      await Message.create({
        thread_id: thread.id,
        author: 'pharmacy',
        body: `Prior Authorization required for ${medication.medicationName || medication.medication_name}. Please complete the EPA form.`,
        payload: {
          type: 'epa_request',
          epa_id: epa.id,
          medication_name: medication.medicationName || medication.medication_name,
          rtbp_info: rtbpInfo
        }
      });

      if (thread.prescriber_email) {
        await Notification.create({
          user_email: thread.prescriber_email,
          recipient_role: 'prescriber', // Added recipient_role
          title: `EPA Required - ${thread.pharmacy_name}`,
          body: `Prior authorization needed for ${medication.medicationName || medication.medication_name}`,
          link_to_thread_id: thread.id
        });
      }

    } catch (error) {
      console.error('Failed to create EPA:', error);
    }
  };

  const handleAcknowledge = async () => {
    setIsSending(true);
    
    await Message.create({
      thread_id: thread.id,
      author: 'pharmacy',
      body: 'Pharmacy is checking—please allow a few minutes.'
    });

    if (thread.prescriber_email) {
      await Notification.create({
        user_email: thread.prescriber_email,
        recipient_role: 'prescriber', // Added recipient_role
        title: `${thread.pharmacy_name} is checking`,
        body: `Your request for ${thread.patient_alias} is being reviewed.`,
        link_to_thread_id: thread.id
      });
    }

    await Thread.update(thread.id, { status: 'in_progress' });
    // setIsAcknowledged(true); // Removed as per outline
    setIsSending(false);
    onUpdate();
  };

  const handleBulkResponse = (status) => {
    const newResponses = {};
    medications.forEach(med => {
      newResponses[med.id] = status;
    });
    setResponses(newResponses);
  };

  const sendEnhancedResponse = async () => {
    setIsSending(true);
    try {
      const enhancedResponses = medications.map(med => ({
        id: med.id,
        medication_name: med.brandName || med.medicationName || med.medication_name,
        dosage: med.dosage,
        form: med.form,
        quantity: med.quantity,
        stock_status: responses[med.id] || 'Not answered', // Using responses[med.id] for stock_status
        rtbp_data: rtbpData[med.id] || {} // Using rtbpData[med.id] for rtbp_data
      }));

      const responsePayload = {
        type: 'enhanced_availability_response',
        responses: enhancedResponses,
        timestamp: new Date().toISOString()
      };

      await Message.create({
        thread_id: thread.id,
        author: 'pharmacy',
        body: 'Enhanced pharmacy reply',
        payload: responsePayload
      });

      // ALWAYS create notification for prescriber
      if (thread.prescriber_email) {
        await Notification.create({
          user_email: thread.prescriber_email,
          recipient_role: 'prescriber',
          title: `Response from ${thread.pharmacy_name}`, // Updated title
          body: `Complete benefit information for ${thread.patient_alias}`,
          link_to_thread_id: thread.id,
        });
      }

      // Check for PA required and create EPA record + notification
      for (const med of responsePayload.responses) {
        if (med.rtbp_data?.prior_auth_required) {
          await EPA.create({
            thread_id: thread.id,
            medication_name: med.medication_name,
            patient_alias: thread.patient_alias,
            prescriber_email: thread.prescriber_email,
            // 'status: pending' removed as per outline
          });

          await Notification.create({
            user_email: thread.prescriber_email,
            recipient_role: 'prescriber',
            title: `Prior Auth Required - ${thread.pharmacy_name}`, // Updated title
            body: `${med.medication_name} needs prior authorization`, // Updated body
            link_to_thread_id: thread.id,
          });
        }
      }

      // Mark thread as answered and prescriber unread
      await Thread.update(thread.id, { 
        status: 'answered', 
        prescriber_read: false,
        updated_date: new Date().toISOString() // Added updated_date
        // 'pharmacy_read: true' removed as per outline
      });

      setIsSent(true); // Keep this to disable UI elements
      onUpdate();
    } catch (error) {
      console.error("Failed to send enhanced response:", error); // Updated error message
      alert("Failed to send response. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const allAnswered = medications.every(med => responses[med.id]);
  const isAcknowledged = thread.status !== 'pending'; // Derived from thread status

  return (
    <Card className="mb-4 border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-4">
            <div>
              <span className="font-semibold text-gray-800">Patient: {patientData?.name || thread.patient_alias}</span>
              <span className="text-sm text-gray-500 ml-2">(DOB: {patientData?.dob || 'N/A'})</span>
              <span className="mx-2 text-gray-400">|</span>
              <span className="text-gray-600">Dr. John Smith</span>
            </div>
            <Badge variant={thread.status === 'pending' ? 'destructive' : 'secondary'}>
              {thread.status}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            {formatDistanceToNow(new Date(thread.created_date), { addSuffix: true })}
          </div>
        </div>
        
        {/* Removed isLoadingRTBP conditional render. Medications will render and fetch data individually. */}
        <div className="space-y-3">
          {medications.map(med => (
            <RTBPMedicationCard
              key={med.id}
              med={med}
              rtbpData={rtbpData[med.id]} // Pass specific medication's RTBP data
              responses={responses}
              setResponses={setResponses}
              isSent={isSent}
              onCreateEPA={handleCreateEPA}
            />
          ))}
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBulkResponse('Yes')} disabled={isSent}>All In Stock</Button> {/* Removed isLoadingRTBP from disabled */}
            <Button size="sm" variant="outline" onClick={() => handleBulkResponse('No')} disabled={isSent}>All Not Available</Button> {/* Removed isLoadingRTBP from disabled */}
            <Button size="sm" variant="outline" onClick={handleAcknowledge} disabled={isSending || isSent || isAcknowledged}>
              {isAcknowledged ? 'Acknowledged ✔' : 'Acknowledge'}
            </Button>
          </div>
          <Button 
            onClick={sendEnhancedResponse} // Updated to call sendEnhancedResponse
            disabled={isSending || isSent || !allAnswered} // Removed isLoadingRTBP from disabled
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Send className="w-4 h-4 mr-2" />}
            {isSent ? "Result Sent" : "Send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

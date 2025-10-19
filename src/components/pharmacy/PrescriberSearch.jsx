
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, MessageSquare, Loader2, Stethoscope, MapPin, Phone } from 'lucide-react';
import { Thread } from '@/api/entities';
import { Message } from '@/api/entities';
import { Notification } from '@/api/entities';
import { User } from '@/api/entities';
import { InvokeLLM } from '@/api/integrations';

const PrescriberCard = ({ prescriber, onStartChat, isStartingChat }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-gray-900">
                {prescriber.first_name} {prescriber.last_name}
                {prescriber.credential && <span className="text-sm text-gray-600">, {prescriber.credential}</span>}
              </h4>
            </div>
            
            <div className="text-sm text-gray-600 space-y-1 mb-2">
              <p><strong>NPI:</strong> {prescriber.npi}</p>
              {prescriber.taxonomy_description && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {prescriber.taxonomy_description}
                  </Badge>
                </div>
              )}
            </div>

            {prescriber.address && (
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>
                    {prescriber.address.address_1}
                    {prescriber.address.city && `, ${prescriber.address.city}`}
                    {prescriber.address.state && `, ${prescriber.address.state}`}
                    {prescriber.address.postal_code && ` ${prescriber.address.postal_code}`}
                  </span>
                </div>
                {prescriber.address.telephone_number && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{prescriber.address.telephone_number}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <Button 
            onClick={() => onStartChat(prescriber)}
            disabled={isStartingChat}
            className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            {isStartingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            Start Chat
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function PrescriberSearch({ onBack, onStartChat, onSelectThread }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  useEffect(() => {
    if (searchTerm.length >= 3) { // Require at least 3 characters for API search
      const timeoutId = setTimeout(() => {
        performNPISearch();
      }, 500); // Debounce API calls
      
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const performNPISearch = async () => {
    setIsSearching(true);
    
    try {
      // Parse search term to determine search type
      const isNPI = /^\d{10}$/.test(searchTerm); // 10 digits = NPI number
      const nameParts = searchTerm.split(' ').filter(part => part.length > 0);
      
      let searchParams = {};
      
      if (isNPI) {
        searchParams.number = searchTerm;
      } else if (nameParts.length >= 2) {
        searchParams.first_name = nameParts[0];
        searchParams.last_name = nameParts.slice(1).join(' ');
      } else if (nameParts.length === 1) {
        // Could be last name or specialty
        const term = nameParts[0];
        searchParams.last_name = term;
        // Also try as specialty in a separate search if no results
      }

      const prompt = `Search the NPI Registry API for prescribers. Make an HTTP GET request to:
      https://npiregistry.cms.hhs.gov/api/?${Object.entries(searchParams).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}&limit=20

      Parse the JSON response and return an array of prescriber objects with this structure:
      {
        "prescribers": [
          {
            "npi": "1234567890",
            "first_name": "John",
            "last_name": "Smith", 
            "credential": "MD",
            "taxonomy_description": "Family Medicine",
            "address": {
              "address_1": "123 Main St",
              "city": "Springfield",
              "state": "IL",
              "postal_code": "62701",
              "telephone_number": "(555) 123-4567"
            }
          }
        ]
      }

      Focus on prescribers (doctors, nurse practitioners, physician assistants). Filter out non-prescribing providers.`;

      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            prescribers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  npi: { type: "string" },
                  first_name: { type: "string" },
                  last_name: { type: "string" },
                  credential: { type: ["string", "null"] },
                  taxonomy_description: { type: ["string", "null"] },
                  address: {
                    type: "object",
                    properties: {
                      address_1: { type: "string" },
                      city: { type: ["string", "null"] },
                      state: { type: ["string", "null"] },
                      postal_code: { type: ["string", "null"] },
                      telephone_number: { type: ["string", "null"] }
                    }
                  }
                }
              }
            }
          }
        }
      });

      setSearchResults(response.prescribers || []);
    } catch (error) {
      console.error('NPI Registry search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartChat = async (prescriber) => {
    setIsStartingChat(true);
    
    try {
      // Get current pharmacy user for context
      const currentUser = await User.me();
      const pharmacyName = currentUser?.pharmacy_name || 'Downtown Pharmacy';
      const pharmacyId = currentUser?.pharmacy_id || 'pharm_001'; // Assuming a pharmacy_id exists on currentUser

      // Create a synthetic email for the prescriber (since NPI registry doesn't include emails)
      const prescriberEmail = `${prescriber.first_name.toLowerCase()}.${prescriber.last_name.toLowerCase()}@npi${prescriber.npi}.provider`;
      
      // Create a new thread initiated by pharmacy
      const thread = await Thread.create({
        patient_alias: 'General Inquiry', // This can be made dynamic later if specific patient context is added
        prescriber_email: prescriberEmail,
        pharmacy_id: pharmacyId,
        pharmacy_name: pharmacyName,
        status: 'in_progress',
        initiated_by: 'pharmacy',
        prescriber_read: false,
        pharmacy_read: true
      });

      // Improve Chat Interface: Add an initial message to the newly created thread
      const initialMessageContent = `Hello Dr. ${prescriber.last_name},\n\nThis is ${pharmacyName}. We are initiating this chat to discuss a patient case.`;

      await Message.create({
        thread_id: thread.id,
        sender_id: currentUser.id, // Assuming currentUser.id is the pharmacy user's ID
        sender_type: 'Pharmacy',
        receiver_id: null, // Message is intended for the thread/prescriber, not a specific pharmacy user within the thread
        content: initialMessageContent,
        status: 'sent',
        read_by_sender: true,
        read_by_receiver: false // Prescriber hasn't read it yet
      });

      // Improve Notifications: Create a notification for the pharmacy user about the new chat
      await Notification.create({
        user_id: currentUser.id,
        type: 'new_chat_initiated',
        message: `Chat started with Dr. ${prescriber.last_name} regarding a patient case.`,
        link: `/chat/${thread.id}`, // Assuming a path to the chat thread
        read: false
      });

      // Navigate to the new thread
      onSelectThread(thread);
      
    } catch (error) {
      console.error('Failed to start chat:', error);
      // In a real application, you might want to show a toast or alert here
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <Card className="max-w-5xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <CardTitle>Find Prescriber</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Search for prescribers by name, NPI number, or specialty
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name (John Smith), NPI (1234567890), or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
          <p><strong>Search Tips:</strong></p>
          <ul className="mt-1 space-y-1">
            <li>• <strong>Name:</strong> &ldquo;John Smith&rdquo; or &ldquo;Smith&rdquo;</li>
            <li>• <strong>NPI:</strong> &ldquo;1234567890&rdquo; (10 digits)</li>
            <li>• <strong>Specialty:</strong> &ldquo;Family Medicine&rdquo;, &ldquo;Cardiology&rdquo;, etc.</li>
          </ul>
        </div>

        {isSearching && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2 text-gray-600">Searching...</span>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">
              Found {searchResults.length} prescriber{searchResults.length !== 1 ? 's' : ''} in NPI Registry
            </h3>
            {searchResults.map((prescriber, index) => (
              <PrescriberCard
                key={`${prescriber.npi}-${index}`}
                prescriber={prescriber}
                onStartChat={handleStartChat}
                isStartingChat={isStartingChat}
              />
            ))}
          </div>
        )}

        {searchTerm.length >= 3 && !isSearching && searchResults.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>No prescribers found matching &ldquo;{searchTerm}&rdquo;</p>
            <p className="text-sm mt-1">Try different search terms or check spelling</p>
          </div>
        )}

        {searchTerm.length < 3 && (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>Enter at least 3 characters to search</p>
            <p className="text-sm mt-1">Search the national NPI registry for any licensed prescriber</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

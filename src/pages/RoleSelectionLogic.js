import { apiPost } from '@/api/base44Client';

export async function saveRoleAndProceed(auth, role) {
  try {
    // Get the ID token from OIDC auth
    const idToken = auth.user?.id_token;
    
    if (!idToken) {
      throw new Error('Not authenticated - no ID token');
    }

    // Call your AWS API Gateway endpoint to save the role to DynamoDB
    // Using the correct endpoint that matches your Lambda function
    const response = await apiPost(
      '/user/role',
      { role },
      {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to save role to backend');
    }

    // Navigate to the appropriate dashboard based on role
    const roleRoutes = {
      prescriber: '/PrescriberTool',
      prescriber_staff: '/PrescriberTool',
      pharmacy_staff: '/PharmacyInterface'
    };
    
    const targetRoute = roleRoutes[role] || '/Home';
    
    // Navigate to the dashboard
    window.location.href = targetRoute;
  } catch (error) {
    console.error('Error saving role:', error);
    // Store temporarily in localStorage as fallback
    localStorage.setItem('userRole', role);
    
    // Navigate anyway
    const roleRoutes = {
      prescriber: '/PrescriberTool',
      prescriber_staff: '/PrescriberTool',
      pharmacy_staff: '/PharmacyInterface'
    };
    window.location.href = roleRoutes[role] || '/Home';
  }
}

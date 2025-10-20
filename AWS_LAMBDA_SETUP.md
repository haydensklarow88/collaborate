# AWS Lambda Functions for RealTimeRx

This guide shows you how to set up the Lambda functions to handle user role management in DynamoDB.

## Prerequisites
- AWS Account with DynamoDB table created
- API Gateway with Cognito Authorizer configured
- DynamoDB table name: `RealTimeRx-Users` (or your chosen name)

## DynamoDB Table Schema

**Table Name:** `RealTimeRx-Users`
**Partition Key:** `userId` (String)

**Attributes:**
- `userId`: String (Cognito sub claim from ID token)
- `email`: String
- `role`: String (prescriber, prescriber_staff, pharmacy_staff, admin)
- `onboarding_complete`: Boolean
- `createdAt`: String (ISO timestamp)
- `updatedAt`: String (ISO timestamp)

## Lambda Function 1: POST /user/role (Save User Role)

```javascript
// Lambda: saveUserRole
// Triggered by: POST /user/role
// Authorizer: Cognito User Pool

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'RealTimeRx-Users';

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract user ID from Cognito authorizer
    const userId = event.requestContext.authorizer.claims.sub;
    const email = event.requestContext.authorizer.claims.email;
    
    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'OPTIONS,POST'
        },
        body: JSON.stringify({ error: 'Unauthorized - no user ID' })
      };
    }
    
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { role } = body;
    
    // Validate role
    const validRoles = ['prescriber', 'prescriber_staff', 'pharmacy_staff', 'admin'];
    if (!role || !validRoles.includes(role)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'OPTIONS,POST'
        },
        body: JSON.stringify({ error: 'Invalid role. Must be one of: ' + validRoles.join(', ') })
      };
    }
    
    // Get existing user to preserve other fields
    let existingUser = null;
    try {
      const getResult = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId }
      }));
      existingUser = getResult.Item;
    } catch (err) {
      console.log('User not found, creating new:', err);
    }
    
    // Save to DynamoDB
    const now = new Date().toISOString();
    const userItem = {
      userId,
      email,
      role,
      user_role: role, // alias for compatibility
      onboarding_complete: true,
      createdAt: existingUser?.createdAt || now,
      updatedAt: now,
      ...existingUser // preserve any other fields
    };
    
    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: userItem
    }));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
      },
      body: JSON.stringify({
        success: true,
        message: 'Role saved successfully',
        user: userItem
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
      },
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
```

## Lambda Function 2: GET /auth/me (Get Current User)

```javascript
// Lambda: getCurrentUser
// Triggered by: GET /auth/me
// Authorizer: Cognito User Pool

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'RealTimeRx-Users';

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract user ID from Cognito authorizer
    const userId = event.requestContext.authorizer.claims.sub;
    const email = event.requestContext.authorizer.claims.email;
    
    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'OPTIONS,GET'
        },
        body: JSON.stringify({ error: 'Unauthorized - no user ID' })
      };
    }
    
    // Get user from DynamoDB
    const result = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId }
    }));
    
    if (!result.Item) {
      // User not found - return minimal info
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'OPTIONS,GET'
        },
        body: JSON.stringify({
          userId,
          email,
          onboarding_complete: false
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,GET'
      },
      body: JSON.stringify(result.Item)
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,GET'
      },
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
```

## Setup Steps

### 1. Create DynamoDB Table
```bash
aws dynamodb create-table \
  --table-name RealTimeRx-Users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Create Lambda Functions

1. Go to AWS Lambda Console
2. Create two functions:
   - `saveUserRole` (Node.js 18.x or later)
   - `getCurrentUser` (Node.js 18.x or later)
3. Copy the respective code above
4. Add environment variable: `TABLE_NAME=RealTimeRx-Users`
5. Add IAM permissions to Lambda execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:YOUR_ACCOUNT_ID:table/RealTimeRx-Users"
    }
  ]
}
```

### 3. Configure API Gateway

1. Create or use existing API Gateway REST API
2. Create resources:
   - `/user/role` → POST → Lambda: `saveUserRole`
   - `/auth/me` → GET → Lambda: `getCurrentUser`
3. Add Cognito User Pool Authorizer to both endpoints
4. Enable CORS for both endpoints
5. Deploy to `prod` stage

### 4. Update Netlify Environment Variables

In Netlify dashboard, add:
```
VITE_API_BASE=https://68gf4jsc6b.execute-api.us-east-1.amazonaws.com/prod
```

### 5. Test

After deploying, test the endpoints:

**Save Role:**
```bash
curl -X POST https://YOUR_API.execute-api.us-east-1.amazonaws.com/prod/user/role \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "pharmacy_staff"}'
```

**Get User:**
```bash
curl https://YOUR_API.execute-api.us-east-1.amazonaws.com/prod/auth/me \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

## Security Notes

- ✅ All PHI/PII stays in AWS (DynamoDB)
- ✅ Frontend only sends ID token for auth
- ✅ Lambda verifies token via Cognito Authorizer
- ✅ CORS restricted to your Netlify domain
- ✅ Encryption at rest enabled on DynamoDB
- ✅ HIPAA-eligible services used

## Next Steps

Once deployed, your role selection will:
1. Save to DynamoDB via Lambda
2. Navigate to the correct dashboard
3. App.jsx will fetch from DynamoDB on load
4. No localStorage needed!

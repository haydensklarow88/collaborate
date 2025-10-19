import Layout from "./Layout.jsx";

import PharmacyInterface from "./PharmacyInterface";

import PrescriberAccess from "./PrescriberAccess";

import PharmacyAccess from "./PharmacyAccess";

import Signin from "./signin";

import Prescriber from "./prescriber";

import Pharmacy from "./pharmacy";

import Admin from "./admin";

import AdminSettings from "./AdminSettings";

import Logout from "./logout";

import PrescriberTool from "./PrescriberTool";

import Home from "./Home";

import Onboarding from "./Onboarding";

import ProfileSettings from "./ProfileSettings";

import PendingNPIVerification from "./PendingNPIVerification";

import AdminUsers from "./AdminUsers";

import AdminNPIVerification from "./AdminNPIVerification";

import AdminMedicationRequests from "./AdminMedicationRequests";

import TeamAccess from "./TeamAccess";

import AdminAnalytics from "./AdminAnalytics";

import FirstLoginReset from "./FirstLoginReset";

import PrescriberToolNew from "./PrescriberToolNew";

import PrescriberRequest from "./PrescriberRequest";

import SecurityCheck from "./SecurityCheck";

import PharmacyPrices from "./PharmacyPrices";

import MedicationPublic from "./MedicationPublic";

import PrescriberLogin from "./PrescriberLogin";

import RoleSelection from "./RoleSelection";

import PharmacySettings from "./PharmacySettings";

import { Route, Routes, useLocation, Navigate } from 'react-router-dom';
import OidcCallback from "./OidcCallback";
import PostAuth from "./PostAuth";

const PAGES = {
    
    PharmacyInterface: PharmacyInterface,
    
    PrescriberAccess: PrescriberAccess,
    
    PharmacyAccess: PharmacyAccess,
    
    signin: Signin,
    
    prescriber: Prescriber,
    
    pharmacy: Pharmacy,
    
    admin: Admin,
    
    AdminSettings: AdminSettings,
    
    logout: Logout,
    
    PrescriberTool: PrescriberTool,
    
    Home: Home,
    
    Onboarding: Onboarding,
    
    ProfileSettings: ProfileSettings,
    
    PendingNPIVerification: PendingNPIVerification,
    
    AdminUsers: AdminUsers,
    
    AdminNPIVerification: AdminNPIVerification,
    
    AdminMedicationRequests: AdminMedicationRequests,
    
    TeamAccess: TeamAccess,
    
    AdminAnalytics: AdminAnalytics,
    
    FirstLoginReset: FirstLoginReset,
    
    PrescriberToolNew: PrescriberToolNew,
    
    PrescriberRequest: PrescriberRequest,
    
    SecurityCheck: SecurityCheck,
    
    PharmacyPrices: PharmacyPrices,
    
    MedicationPublic: MedicationPublic,
    
    PrescriberLogin: PrescriberLogin,
    
    RoleSelection: RoleSelection,
    
    PharmacySettings: PharmacySettings,
    
};

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>
                <Route path="/" element={<Signin />} />
                <Route path="/oidc-callback" element={<OidcCallback />} />
                <Route path="/post-auth" element={<PostAuth />} />
                
                <Route path="/PharmacyInterface" element={<PharmacyInterface />} />
                
                <Route path="/PrescriberAccess" element={<PrescriberAccess />} />
                
                <Route path="/PharmacyAccess" element={<PharmacyAccess />} />
                
                <Route path="/signin" element={<Signin />} />
                
                <Route path="/prescriber" element={<Prescriber />} />
                
                <Route path="/pharmacy" element={<Pharmacy />} />
                
                <Route path="/admin" element={<Admin />} />
                
                <Route path="/AdminSettings" element={<AdminSettings />} />
                
                <Route path="/logout" element={<Logout />} />
                
                <Route path="/PrescriberTool" element={<PrescriberTool />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Onboarding" element={<Onboarding />} />
                
                <Route path="/ProfileSettings" element={<ProfileSettings />} />
                
                <Route path="/PendingNPIVerification" element={<PendingNPIVerification />} />
                
                <Route path="/AdminUsers" element={<AdminUsers />} />
                
                <Route path="/AdminNPIVerification" element={<AdminNPIVerification />} />
                
                <Route path="/AdminMedicationRequests" element={<AdminMedicationRequests />} />
                
                <Route path="/TeamAccess" element={<TeamAccess />} />
                
                <Route path="/AdminAnalytics" element={<AdminAnalytics />} />
                
                <Route path="/FirstLoginReset" element={<FirstLoginReset />} />
                
                <Route path="/PrescriberToolNew" element={<PrescriberToolNew />} />
                
                <Route path="/PrescriberRequest" element={<PrescriberRequest />} />
                
                <Route path="/SecurityCheck" element={<SecurityCheck />} />
                
                <Route path="/PharmacyPrices" element={<PharmacyPrices />} />
                
                <Route path="/MedicationPublic" element={<MedicationPublic />} />
                
                <Route path="/PrescriberLogin" element={<PrescriberLogin />} />
                
                <Route path="/RoleSelection" element={<RoleSelection />} />
                
                <Route path="/PharmacySettings" element={<PharmacySettings />} />
                <Route path="*" element={<Navigate to="/signin" replace />} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <>
            <PagesContent />
        </>
    );
}
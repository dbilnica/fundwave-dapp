import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import idl from "@/components/idl/crowdfunding_dapp.json";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { BN, Program, ProgramAccount, AnchorProvider, web3, utils, getProvider } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
// Import other necessary hooks and components

const CampaignDetail: FC = () => {
    const router = useRouter();
    const { campaignId } = router.query;
    const [campaign, setCampaign] = useState(null);
    // Add state and functions to handle fetching and displaying campaign details

    useEffect(() => {
        // Function to fetch campaign details from the blockchain using `campaignId`
        async function fetchCampaignDetails() {
            // Your logic to fetch campaign details
        }

        if (campaignId) {
            fetchCampaignDetails();
        }
    }, [campaignId]);

    if (!campaign) {
        return <div>Loading...</div>; // Show a loading state while fetching details
    }

    return (
        <div>
            {/* Render your campaign details here */}
            <h1>{campaign.name}</h1>
            {/* More campaign details */}
        </div>
    );
};

export default CampaignDetail;

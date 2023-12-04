import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import idl from "@/components/idl/crowdfunding_dapp.json";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { BN, Program, ProgramAccount, AnchorProvider, web3, utils, getProvider } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string)
const programID = new PublicKey(idl.metadata.address);

interface CampaignsTableProps {
    program: Program;
    walletKey: PublicKey;
    campaignId: string;
}

export const CampaignDetail: FC<CampaignsTableProps> = ({ program, walletKey, campaignId }) => {
    const [campaign, setCampaign] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const getCampaign = async () => {
        try {
            const campaignPublicKey = new PublicKey(campaignId);
            const campaignData = await program.account.campaign.fetch(campaignPublicKey);
            setCampaign(campaignData);
            setIsLoading(false);

        } catch (error) {
            setIsLoading(false);
            console.error("Error while fetching the campaign details:", error)
        }
    };

    const Loader = () => (
        <div className="flex justify-center items-center">
            <span className="loading loading-spinner loading-lg"></span>
        </div>
    );

    useEffect(() => {
        if (campaignId && typeof campaignId === 'string') {
            getCampaign();
        }
    }, [campaignId, walletKey, program])

    if (!campaign) {
        return <Loader/>
    }

    return (
        <div>
            {/* Render your campaign details here */}
            <h1>{campaign.name}</h1>
            {/* More campaign details */}
        </div>
    );
};

export const ShowCampaign: FC = () => {
    const ourWallet = useWallet();
    const router = useRouter();
    const { campaignId } = router.query;
    const { connection } = useConnection();
    const [program, setProgram] = useState<Program | null>(null);

    const getProvider = async (): Promise<AnchorProvider> => {
        const provider = new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())
        return provider;
    }

    const initializeProgram = async () => {
        try {
            const anchProvider = await getProvider();
            const program = new Program(idl_object, programID, anchProvider);
            setProgram(program);
        } catch (error) {
            console.error("Error while program initialization")
        }
    };

    const campaignIdString = Array.isArray(campaignId) ? campaignId[0] : campaignId;

    useEffect(() => {
        initializeProgram();
    }, [ourWallet, connection]);

    /*if (typeof campaignIdString !== 'string') {
        return <Loader/>
    }*/

    return (
        <div className='campaigns-view p-5'>
            <CampaignDetail walletKey={ourWallet.publicKey!} program={program} campaignId={campaignIdString} />
        </div>
    );
};

export default ShowCampaign;

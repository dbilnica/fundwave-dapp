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
    const ourWallet = useWallet();
    const { connection } = useConnection();
    const [campaignPublicKey, setCampaignPublicKey] = useState(null);

    const getCampaign = async () => {
        if (!campaignId) {
            console.error("Campaign ID is undefined");
            setIsLoading(false);
            return;
        }
        try {
            const campaignKey = new PublicKey(campaignId);
            const campaignData = await program.account.campaign.fetch(campaignKey);
            setCampaign(campaignData);
            setCampaignPublicKey(campaignKey);
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

    const getProvider = async (): Promise<AnchorProvider> => {
        const provider = new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())
        return provider;
    }

    const supportCampaign = async (amount) => {
        try {
            const anchProvider = await getProvider();
            const program = new Program(idl_object, programID, anchProvider)
            console.log("Test")
            console.log(campaignPublicKey);
            

            await program.methods.campaignSupport(new BN(amount))
                .accounts({
                    campaign: campaignPublicKey,
                    user: anchProvider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,

                }).rpc();
            console.log("Campaign has been successfully supported " + campaignPublicKey)
            setTimeout(getCampaign, 2000);
        } catch (error) {
            console.log("Error while supporting")
        }
    }

    const cancelSupport = async (publicKey) => {
        try {
            const anchProvider = await getProvider();
            const program = new Program(idl_object, programID, anchProvider)

            await program.methods.supportCancel()
                .accounts({
                    campaign: publicKey,
                    user: anchProvider.wallet.publicKey,
                }).rpc();
            console.log("Campaign support been successfully canceled")
            setTimeout(getCampaign, 2000);
        } catch (error) {
            console.log("Error while cancelling support")
        }
    }

    const withdrawCampaign = async (publicKey) => {
        try {
            const anchProvider = await getProvider();
            const program = new Program(idl_object, programID, anchProvider)

            await program.methods.campaignWithdraw()
                .accounts({
                    campaign: publicKey,
                    user: anchProvider.wallet.publicKey,

                }).rpc();
            console.log("Campaign has been successfully withdrawed " + publicKey)

        } catch (error) {
            console.log("Error while withdrawing")
        }
    }

    useEffect(() => {
        if (campaignId && typeof campaignId === 'string') {
            getCampaign();
        }
    }, [campaignId, walletKey, program])

    if (!campaign) {
        return <Loader />
    }

    return (
        <div className="shadow-md rounded-lg overflow-hidden my-4">

            <div className="p-4">
                <h1 className="font-bold text-xl mb-2">{campaign.name}</h1>
                <p className="text-grey-darker text-base mb-4">
                    {campaign.description}
                </p>
                <p className="text-grey-darker text-base">
                    Goal: {campaign.goal?.toString()} SOL
                </p>
                <p className="text-grey-darker text-base">
                    Pledged: {campaign.pledged?.toString()} SOL
                </p>

                {/* You can add additional campaign details here */}
            </div>
            <div className="p-4 border-t border-grey-light">
                <span className="text-sm text-grey-dark">Days Remaining: { /* Logic to display remaining days */}</span>
            </div>
            <div className="px-4 pt-3 pb-4 border-t border-grey-light">
                <div className="text-xs uppercase font-bold text-grey-dark tracking-wide">Support This Campaign</div>
                <div className="flex mt-2">
                    <button
                        onClick={() => supportCampaign(100)} // Replace 100 with the amount you wish to support
                        className="bg-blue-500 hover:bg-blue-dark text-white font-bold py-2 px-4 rounded"
                    >
                        Support with 100 SOL
                    </button>
                    <button
                        onClick={() => cancelSupport(campaignPublicKey.campaignKey)}
                        className="bg-red-500 hover:bg-red-dark text-white font-bold py-2 px-4 rounded ml-2"
                    >
                        Cancel Support
                    </button>
                </div>
            </div>
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

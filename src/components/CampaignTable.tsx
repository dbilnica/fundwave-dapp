import { useEffect, useState, FC } from 'react';
import { BN, Program, ProgramAccount, AnchorProvider, web3, utils, getProvider } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import idl from "./crowdfunding_dapp.json";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { publicKey } from '@project-serum/anchor/dist/cjs/utils';


const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string)
const programID = new PublicKey(idl.metadata.address);

interface CampaignsTableProps {
    program: Program;
    walletKey: PublicKey;
}

export const CampaignsTable: FC<CampaignsTableProps> = ({ program, walletKey }) => {
    const [campaigns, setCampaigns] = useState<ProgramAccount[]>([]);

    const ourWallet = useWallet();
    const { connection } = useConnection();
    const [amount, setAmount] = useState("");
    const [countdowns, setCountdowns] = useState({});
    const [isLoading, setIsLoading] = useState(true);


    const calculateTimeRemaining = (endTimestamp) => {
        const now = new Date().getTime();
        const distance = endTimestamp - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        return {
            days,
            hours,
            minutes,
            seconds,
            distance
        };
    };

    const getProvider = async (): Promise<AnchorProvider> => {
        const provider = new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())
        return provider;
    }

    const getAllCampaigns = async () => {
        try {
            const fetchedCampaigns = await program.account.campaign.all();

            const currentTime = new Date().getTime();

            // Filter out ended and ongoing campaigns
            const ongoingCampaigns = fetchedCampaigns.filter(campaign =>
                new Date(campaign.account.endCampaign.toNumber() * 1000).getTime() > currentTime
            );
            const endedCampaigns = fetchedCampaigns.filter(campaign =>
                new Date(campaign.account.endCampaign.toNumber() * 1000).getTime() <= currentTime
            );

            // Sort ongoing campaigns by end time, soonest first
            ongoingCampaigns.sort((a, b) => {
                return a.account.endCampaign.toNumber() - b.account.endCampaign.toNumber();
            });

            const sortedCampaigns = ongoingCampaigns.concat(endedCampaigns);

            setCampaigns(sortedCampaigns);
            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
            console.error("Error while getting the campaigns")
        }
    };

    const supportCampaign = async (publicKey, amount) => {
        try {
            const anchProvider = await getProvider();
            const program = new Program(idl_object, programID, anchProvider)

            await program.methods.campaignSupport(new BN(amount))
                .accounts({
                    campaign: publicKey,
                    user: anchProvider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,

                }).rpc();
            console.log("Campaign has been successfully supported " + publicKey)
            setTimeout(getAllCampaigns, 2000);
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
            setTimeout(getAllCampaigns, 2000);
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

    const Countdown: FC<{ endTime: number }> = ({ endTime }) => {
        const [timeLeft, setTimeLeft] = useState(() => calculateTimeRemaining(endTime));

        useEffect(() => {
            const timer = setInterval(() => {
                setTimeLeft(calculateTimeRemaining(endTime));
            }, 1000);

            return () => clearInterval(timer);
        }, [endTime]);

        return (
            <div>
                {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
            </div>
        );
    };

    const ProgressBar: FC<{ goal: number, pledged: number }> = ({ goal, pledged }) => {
        const progressPercent = Math.min(100, (pledged / goal) * 100);

        return (
            <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '8px' }}>
                <div style={{
                    height: '10px',
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(to bottom right, #667eea, #764ba2)',
                    borderRadius: '8px'
                }}>
                </div>
            </div>
        );
    };

    useEffect(() => {
        getAllCampaigns();
    }, [walletKey, program]);

    if (isLoading) {
        return <div>Loading campaigns...</div>;
    }

    const CampaignCard: FC<{ campaign: ProgramAccount }> = ({ campaign }) => {
        const endTime = new Date(campaign.account.endCampaign.toNumber() * 1000).getTime();
        const ipfsImageUrl = `https://ipfs.io/ipfs/${campaign.account.imageIpfsHash}`;
        const progressPercent = Math.min(100, (Number(campaign.account.pledged) / Number(campaign.account.goal)) * 100);

        return (
            <div className="card w-96 bg-base-100 shadow-xl m-2">
                <figure className="px-10 pt-10">
                    <img src={ipfsImageUrl} alt="Campaign" className="rounded-xl" />
                </figure>
                <div className="card-body">
                    <h2 className="card-title text-2xl font-bold" style={{ textTransform: 'uppercase' }}>{campaign.account.name}</h2>
                    <ProgressBar goal={Number(campaign.account.goal)} pledged={Number(campaign.account.pledged)} />
                    <p className="text-lg">Goal: {campaign.account.goal.toString()} SOL</p>
                    <p className="text-lg">Pledged: {campaign.account.pledged.toString()} SOL</p>
                    <Countdown endTime={endTime} />
                    <div className="card-actions justify-center">
                        <button className="btn btn-secondary text-2xl font-bold" style={{ width: '100%' }} onClick={() => supportCampaign(campaign.publicKey, 14500)}>Pledge</button>
                    </div>
                </div>
            </div>
        );
    };
    return (
        <>
            <div className="flex flex-wrap justify-start">
                {campaigns.map((c) => (
                    <CampaignCard key={c.publicKey.toBase58()} campaign={c} />
                ))}
            </div>
        </>
    );
};

export const ShowCampaigns: FC = () => {
    const ourWallet = useWallet();
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

    useEffect(() => {
        initializeProgram();
    }, [ourWallet, connection]);

    return (
        <div className='campaigns-view p-5'>
            {!ourWallet.connected && <WalletMultiButton />}
            {ourWallet.connected && program && <CampaignsTable walletKey={ourWallet.publicKey!} program={program} />}
        </div>
    );
};

export default ShowCampaigns;


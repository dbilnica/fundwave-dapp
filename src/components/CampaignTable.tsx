import { useEffect, useState, FC } from 'react';
import { BN, Program, ProgramAccount, AnchorProvider, web3, utils, getProvider } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import idl from "./crowdfunding_dapp.json";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

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

            await program.methods.supportCampaign(new BN(amount))
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

    const withdrawCampaign = async (publicKey) => {
        try {
            const anchProvider = await getProvider();
            const program = new Program(idl_object, programID, anchProvider)

            await program.methods.withdrawCampaign()
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
        const interval = setInterval(() => {
            const newCountdowns = {};
            campaigns.forEach(campaign => {
                const endTime = new Date(campaign.account.endCampaign.toNumber() * 1000);
                if (!isNaN(endTime.getTime())) {
                    newCountdowns[campaign.publicKey.toBase58()] = calculateTimeRemaining(endTime);
                }
            });
            setCountdowns(newCountdowns);
        }, 1000);

        return () => clearInterval(interval);
    }, [campaigns]);


    useEffect(() => {
        getAllCampaigns();
    }, [walletKey, program]);

    if (isLoading) {
        return <div>Loading campaigns...</div>;
    }

    return (
        <>
            <div className="font-bold text-xl mb-4">Campaigns</div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-base-100 shadow overflow-hidden rounded-lg">
                    <thead className="text-white bg-gradient-to-br from-indigo-500 to-fuchsia-500">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Target Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Donated</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">End Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Donate Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#5252529f] bg-primary">
                        {campaigns.map((c, i) => {
                            const countdown = countdowns[c.publicKey.toBase58()] || {};
                            return (
                                <tr key={c.publicKey.toBase58()} className="bg-white text-gray-700">
                                    <td className="px-6 py-4 whitespace-nowrap">{i + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{c.account.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap truncate">{c.account.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{c.account.goal.toString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{c.account.pledged.toString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {countdowns[c.publicKey.toBase58()] === undefined
                                            ? <span>Loading...</span>
                                            : countdowns[c.publicKey.toBase58()].distance > 0
                                                ? `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`
                                                : "Campaign ended"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="number"
                                            className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring focus:border-blue-300 transition duration-200"
                                            placeholder="Amount"
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button
                                            className="btn bg-gradient-to-br from-indigo-500 to-fuchsia-500 border-2 border-[#5252529f] text-white"
                                            onClick={() => supportCampaign(c.publicKey, amount)}
                                        >
                                            Pledge
                                        </button>
                                        <button
                                            className="btn bg-gradient-to-br from-indigo-500 to-fuchsia-500 border-2 border-[#5252529f] text-white"
                                            onClick={() => withdrawCampaign(c.publicKey)}
                                        >
                                            Withdraw Campaign
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
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


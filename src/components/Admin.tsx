import { useEffect, useState, FC } from 'react';
import { BN, Program, ProgramAccount, AnchorProvider, web3, utils, getProvider } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { Table, Button } from 'react-bootstrap';
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

export const AdminTable: FC<CampaignsTableProps> = ({ program, walletKey }) => {
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
            setCampaigns(fetchedCampaigns);
            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
            console.error("Error while getting the campaigns")
        }
    };

    const reviewCampaign = async (publicKey) => {
        try {
            const anchProvider = await getProvider();
            const program = new Program(idl_object, programID, anchProvider)

            const [admin] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("admin_account")
            ], program.programId)

            await program.methods.reviewCampaign()
                .accounts({
                    campaign: publicKey,
                    admin,
                    user: anchProvider.wallet.publicKey,

                }).rpc();
            console.log("Campaign has been successfully reviewed " + publicKey)
        } catch (error) {
            console.log("Error while reviewing")
        }
    }

    const cancelCampaign = async (publicKey) => {
        try {
            const anchProvider = await getProvider();
            const program = new Program(idl_object, programID, anchProvider)

            const [admin] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("admin_account")
            ], program.programId)

            await program.methods.cancelCampaign()
                .accounts({
                    campaign: publicKey,
                    admin,
                    user: anchProvider.wallet.publicKey,

                }).rpc();
            console.log("Campaign has been successfully canceled " + publicKey)

        } catch (error) {
            console.log("Error while cancelling")
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
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button
                                            className="btn bg-gradient-to-br from-indigo-500 to-fuchsia-500 border-2 border-[#5252529f] text-white"
                                            onClick={() => reviewCampaign(c.publicKey)}
                                        >
                                            Review Campaign
                                        </button>
                                        <button
                                            className="btn bg-gradient-to-br from-indigo-500 to-fuchsia-500 border-2 border-[#5252529f] text-white"
                                            onClick={() => cancelCampaign(c.publicKey)}
                                        >
                                            Cancel Campaign
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

export const Admin: FC = () => {
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
            {ourWallet.connected && program && <AdminTable walletKey={ourWallet.publicKey!} program={program} />}
        </div>
    );
};

export default Admin;


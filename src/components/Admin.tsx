import { useEffect, useState, FC } from 'react';
import { BN, Program, ProgramAccount, AnchorProvider, web3, utils, getProvider } from '@project-serum/anchor';
import { Account, PublicKey } from '@solana/web3.js';
import { Table, Button } from 'react-bootstrap';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import idl from "./crowdfunding_dapp.json";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

    const [pubkeyInput, setPubkeyInput] = useState("");
    const [pubkeyNewAdminInput, setPubkeyNewAdminInput] = useState("");

    const onPubkeyInputChange = (event) => {
        setPubkeyInput(event.target.value);
    };

    const onPubkeyNewAdminInputChange = (event) => {
        setPubkeyNewAdminInput(event.target.value);
    };

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

    const reviewCampaign = async (publicKey) => {
        try {
            const anchProvider = await getProvider();
            const program = new Program(idl_object, programID, anchProvider)

            const [admin] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("admin_account")
            ], program.programId)

            const campaignToReview = campaigns.find(c => c.publicKey.toBase58() === publicKey.toBase58());
            await program.methods.campaignReview()
                .accounts({
                    campaign: publicKey,
                    admin,
                    user: anchProvider.wallet.publicKey,

                }).rpc();
            toast.success(`Campaign "${campaignToReview.account.name}" has been successfully reviewed!`);
            console.log(`Campaign "${campaignToReview.account.name}" has been successfully reviewed!`);
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

            const campaignToCancel = campaigns.find(c => c.publicKey.toBase58() === publicKey.toBase58());

            await program.methods.campaignCancel()
                .accounts({
                    campaign: publicKey,
                    admin,
                    user: anchProvider.wallet.publicKey,

                }).rpc();
            toast.success(`Campaign "${campaignToCancel.account.name}" has been successfully canceled!`);
            console.log(`Campaign "${campaignToCancel.account.name}" has been successfully canceled!`);
        } catch (error) {
            toast.error("Campaign has been successfully canceled " + publicKey);
            console.log("Error while cancelling")
        }
    }
    const initAdmin = async () => {
        try {
            const anchProvider = await getProvider();
            const program = new Program(idl_object, programID, anchProvider);
            const signerPubkey = anchProvider.wallet.publicKey;

            const [admin] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("admin_account")
            ], program.programId)

            console.log(admin.toBase58());
            console.log(program.programId.toBase58())
            console.log(signerPubkey.toBase58());

            await program.methods.adminInitialize()
                .accounts({
                    admin,
                    user: signerPubkey,
                    systemProgram: web3.SystemProgram.programId
                }).rpc();
            toast.success("Admin initialized successfully!");
            console.log("Admin initialized successfully");
        } catch (error) {
            toast.error("Error while initializing admin!");
            console.error("Error while initializing admin: ", error);
        }
    };

    const transferOwnership = async () => {
        try {
            const anchProvider = await getProvider();
            const program = new Program(idl_object, programID, anchProvider);
            const signerPubkey = anchProvider.wallet.publicKey;
            const newAdminPubkey = new PublicKey(pubkeyNewAdminInput);

            const [currentAdmin] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("admin_account")
            ], program.programId)

            console.log(currentAdmin.toBase58());
            console.log(program.programId.toBase58())
            console.log(signerPubkey.toBase58());

            await program.methods.ownershipTransfer(newAdminPubkey)
                .accounts({
                    currentAdmin,
                    user: signerPubkey,
                }).rpc();
            toast.success("Ownership has been transfered successfully!");
            console.log("Ownership has been transfered successfully");

        } catch (error) {
            toast.error("Error while transfering the ownership!");
            console.error("Error while transfering the ownership: ", error);
        }
    };


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

    const handleAdminInit = (e) => {
        e.preventDefault(); // This will prevent the page from refreshing
        initAdmin();
    };

    const handleTransferOwnership = (e) => {
        e.preventDefault(); // This will prevent the page from refreshing
        transferOwnership();
    };

    return (
        <>
            <ToastContainer position='top-center' />
            <div className="mb-8">
                <label htmlFor="admin-pubkey" className="block text-sm font-bold text-xl mb-4">Admin Initialization Button </label>
                <button
                    className="mt-4 btn bg-gradient-to-br from-indigo-500 to-fuchsia-500 border-2 border-[#5252529f] text-white"
                    onClick={handleAdminInit}
                >
                    Initialize Admin
                </button>
            </div>

            <div className="mb-8">
                <label htmlFor="new-admin-pubkey" className="block text-sm font-bold text-xl mb-4">New Admin PublicKey</label>
                <input
                    id="new-admin-pubkey"
                    type="text"
                    placeholder="Enter new admin public key"
                    value={pubkeyNewAdminInput}
                    onChange={onPubkeyNewAdminInputChange}
                    className="mt-1 block w-3/4 md:w-1/2 lg:w-1/3 mx-auto px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                    className="mt-4 btn bg-gradient-to-br from-indigo-500 to-fuchsia-500 border-2 border-[#5252529f] text-white"
                    onClick={handleTransferOwnership}
                >
                    Transfer Ownership
                </button>
            </div>
            <div className="font-bold text-xl mb-4">Campaigns</div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-base-100 shadow overflow-hidden rounded-lg">
                    <thead className="text-white bg-gradient-to-br from-indigo-500 to-fuchsia-500">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
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
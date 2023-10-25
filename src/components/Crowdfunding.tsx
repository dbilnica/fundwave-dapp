// TODO: SignMessage
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { FC, useState, useEffect, ChangeEvent } from 'react';
import { Program, ProgramAccount, AnchorProvider, web3, utils, BN } from "@project-serum/anchor"
import { PublicKey } from '@solana/web3.js';
import { FloatingLabel, Form } from 'react-bootstrap';
import idl from "./crowdfunding_dapp.json"
import { program } from '@project-serum/anchor/dist/cjs/native/system';

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string)
const programID = new PublicKey(idl.metadata.address)

export const Crowdfunding: FC = () => {
    const ourWallet = useWallet();
    //fetch current connection all of the project
    const { connection } = useConnection();

    const [campaigns, setCampaigns] = useState<ProgramAccount[]>([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [goal, setGoal] = useState<number>(1);
    const [duration, setDuration] = useState<number>(1);
    //const [adminPubkey, setAdminPubkey] = useState<PublicKey | null>(null);
    const [pubkeyInput, setPubkeyInput] = useState("");

    type CampaignData = {
        name: string;
        description: string;
        goal: BN;  // The fetched data shows "goal" as a string, but you might be converting it to BN in your code.
        pledged: BN; // Same as above.
        duration: BN; // Same as above.
        endCampaign: BN; // Same as above.
        owner: PublicKey;  // This is represented as a string in your data, but you might be converting it to PublicKey in your code.
        isActive: boolean;
        isPledged: boolean;
    };

    type ProgramAccount = {
        publicKey: PublicKey;
        account: CampaignData;
    };

    useEffect(() => {
        getCampaigns();
    }, []);
    useEffect(() => {
        console.log("Current campaigns state:", campaigns);
    }, [campaigns]);


    //interacting with anchor program 
    const getProvider = async (): Promise<AnchorProvider> => {
        //actual connection to the cluster, where is snart contract deployed
        const provider = new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())
        return provider;
    }
    const onNameChange = (e: ChangeEvent<any>) => {
        setName(e.target.value);
    };

    const onDescriptionChange = (e: ChangeEvent<any>) => {
        setDescription(e.target.value);
    };
    const onGoalChange = (e: ChangeEvent<any>) => {
        setGoal(e.target.value);
    };
    const onDurationChange = (e: ChangeEvent<any>) => {
        setDuration(e.target.value);
    };

    const onPubkeyInputChange = (event) => {
        setPubkeyInput(event.target.value);
    };


    const createCampaign = async () => {
        try {
            // obtaining provider
            const anchProvider = await getProvider();
            const program = new Program(idl_object, programID, anchProvider)

            // we need to be sure that we've created a new PDA for our bank app
            // we need to add programId, bump is added automatically
            // we want to fidn the address according to the seeds we are supplying there 
            // we need to supply bank account string  utils.bytes.utf8.encode("bankaccount") - first string to generate our PDA
            const [campaign] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("crowdfunding"),
                (await anchProvider).wallet.publicKey.toBuffer() // public key of user that is creating PDA
            ], program.programId)

            const [admin] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("admin_account")
            ], program.programId)

            await program.rpc.createCampaign(name, description, new BN(goal), new BN(duration), {
                // we need to add all the accounts we are working with 
                accounts: {
                    campaign,
                    user: anchProvider.wallet.publicKey,
                    admin,
                    systemProgram: web3.SystemProgram.programId
                }
            })
            console.log("Duration of the campaign is" + duration.toString())
            console.log("Wow, new campaign was created!" + campaign.toString())

        } catch (error) {
            console.log("Error while creating campaign ;( " + error)
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

            await program.rpc.initializeAdmin(signerPubkey, {
                accounts: {
                    admin,
                    user: signerPubkey,
                    systemProgram: web3.SystemProgram.programId
                }
            });

            console.log("Admin initialized successfully");

        } catch (error) {
            console.error("Error while initializing admin: ", error);
        }
    };


    /*const getCampaigns = async () => {
        const anchProvider = await getProvider()
        const program = new Program(idl_object, programID, anchProvider)

        try {
            Promise.all(
                (await connection.getProgramAccounts(programID)).map(async (account) => {
                    const campaignData = await program.account.campaign.fetch(account.pubkey);
                    return {
                        publicKey: account.pubkey,
                        account: campaignData
                    };
                })
            ).then((campaigns: ProgramAccount[]) => {
                console.log(campaigns);
                setCampaigns(campaigns);
            });


        }
        catch (error) {
            console.error("Error while getting the campaigns")
        }
    }*/

    const getCampaigns = async () => {
        const anchProvider = await getProvider()
        const program = new Program(idl_object, programID, anchProvider)
        const programAccounts = await connection.getProgramAccounts(programID);
        console.log('Fetched program accounts:', programAccounts.length);

        try {
            Promise.all(
                (await connection.getProgramAccounts(programID)).map(async (account) => {
                    const campaignData = await program.account.campaign.fetch(account.pubkey);
                    console.log("Campaign Data for pubkey:", account.pubkey, campaignData);
                    console.log("Processed account:", account.pubkey.toBase58());

                    console.log("Raw campaignData:", campaignData);
                    return {
                        publicKey: account.pubkey,
                        account: campaignData
                    };
                })
            ).then((campaigns: ProgramAccount[]) => {
                console.log(campaigns);
                console.log("About to set campaigns:", campaigns);
                setCampaigns(campaigns);
            });


        }
        catch (error) {
            console.error("Error while getting the campaigns")
        }
    }
    
    //publicKey is the PDA where we are going to deposit money

    /*
    const depositBank = async (publicKey) => {
        try {
            // obtaining provider
            const anchProvider = await getProvider();
            const program = new Program(idl_object, programID, anchProvider)

            await program.rpc.deposit(new BN(0.1 * web3.LAMPORTS_PER_SOL), {
                accounts: {
                    bank: publicKey,
                    user: anchProvider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId
                }
            })

            console.log("Deposit done" + publicKey)
        } catch (error) {
            console.error("Error while depositing")
        }
    }*/
    const handleSubmit = async (e) => {
        e.preventDefault(); // This will prevent the page from refreshing
        createCampaign();
    }
    
    // Handler function when 'Initialize Admin' button is clicked
    const handleAdminInit = (e) => {
        e.preventDefault(); // This will prevent the page from refreshing
        initAdmin();
    };

    return (
        <div className="flex justify-center item-center h-screen">
            <>
                <div className="relative group">
                    <Form id='create' onSubmit={handleSubmit}>
                        <Form.Group className='mb-3'>
                            <FloatingLabel controlId='name' label='Name'>
                                <Form.Control type='text' placeholder='Name of the campaign' value={name} onChange={onNameChange} />
                            </FloatingLabel>
                        </Form.Group>
                        <Form.Group className='mb-3'>
                            <FloatingLabel controlId='description' label='Description'>
                                <Form.Control as='textarea' placeholder='Description of the campaign' style={{ height: '150px' }} value={description} onChange={onDescriptionChange} />
                            </FloatingLabel>
                        </Form.Group>
                        <Form.Group className='mb-3'>
                            <FloatingLabel
                                controlId='goal' label='Goal'>
                                <Form.Control as='input' placeholder='Goal of the campaign' value={goal} onChange={onGoalChange} />
                            </FloatingLabel>
                        </Form.Group>
                        <Form.Group className='mb-3'>
                            <FloatingLabel
                                controlId='duration' label='Duration'>
                                <Form.Control as='input' placeholder='Duration of the campaign' value={duration} onChange={onDurationChange} />
                            </FloatingLabel>
                        </Form.Group>
                        <Form.Group className='mb-3'>
                            <button className="group btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black" type='submit'>
                                <span className="block group-disabled:hidden">
                                    Create Campaign
                                </span>
                            </button>
                        </Form.Group>
                    </Form>
                    <Form id='adminInit' onSubmit={handleAdminInit} className="mt-5">
                        <Form.Group className='mb-3'>
                            <FloatingLabel controlId='pubkey' label='Admin Pubkey'>
                                <Form.Control type='text' placeholder='Enter Admin Pubkey' value={pubkeyInput} onChange={onPubkeyInputChange} />
                            </FloatingLabel>
                        </Form.Group>

                        <Form.Group className='mb-3'>
                            <button className="btn bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black">
                                Initialize Admin
                            </button>
                        </Form.Group>
                    </Form>

                    {/* Display all campaigns */}
                    <div className="mt-5">
                        <h2 className="text-center text-xl font-bold">All Campaigns</h2>
                        <ul>
                            {campaigns.map((campaign, index) => (
                                <li key={index} className="border p-4 mb-2">
                                    <h3 className="text-lg font-semibold">{campaign.account.name}</h3>
                                    <p>{campaign.account.description}</p>
                                    <p>Goal: {campaign.account.goal?.toString()}</p>
                                    <p>Duration: {campaign.account.duration?.toString()}</p>
                                    <p>End Campaign: {campaign.account.endCampaign?.toString()}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </>
        </div>
    );
};

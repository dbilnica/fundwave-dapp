// TODO: SignMessage
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { FC, useState, useEffect, ChangeEvent } from 'react';
import { Program, ProgramAccount, AnchorProvider, web3, utils, BN } from "@project-serum/anchor"
import { PublicKey } from '@solana/web3.js';
import idl from "./crowdfunding_dapp.json"

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string)
const programID = new PublicKey(idl.metadata.address)

export const Crowdfunding: FC = () => {
    const ourWallet = useWallet();
    //fetch current connection all of the project
    const { connection } = useConnection();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [goal, setGoal] = useState<number>(1);
    const [duration, setDuration] = useState<number>(1);

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

    const createCampaign = async () => {
        try {
            // obtaining provider
            const anchProvider = await getProvider();
            const program = new Program(idl_object, programID, anchProvider)

            // we need to be sure that we've created a new PDA for our bank app
            // we need to add programId, bump is added automatically
            // we want to fidn the address according to the seeds we are supplying there 
            const [campaign] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("crowdfunding"),
                (await anchProvider).wallet.publicKey.toBuffer() // public key of user that is creating PDA
            ], program.programId)

            const [admin] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("admin_account")
            ], program.programId)

            await program.methods.createCampaign(name, description, new BN(goal), new BN(duration))
                // we need to add all the accounts we are working with 
                .accounts({
                    campaign,
                    user: anchProvider.wallet.publicKey,
                    admin,
                    systemProgram: web3.SystemProgram.programId,
                }).rpc();
            console.log("Duration of the campaign is" + duration.toString())
            console.log("Wow, new campaign was created!" + campaign.toString())

        } catch (error) {
            console.log("Error while creating campaign ;( " + error)
        }

    }

    //publicKey is the PDA where we are going to deposit money
    const handleSubmit = async (e) => {
        e.preventDefault(); // This will prevent the page from refreshing
        createCampaign();
    }

    return (
        <div className='campaigns-create p-5'>
            <div className="font-bold text-xl mb-4">Create Campaign</div>
            <div className="overflow-hidden rounded-lg shadow-lg">
                <form id='create' onSubmit={handleSubmit} className="bg-base-100 p-6">
                    <div className="mb-6">
                        <label htmlFor='name' className="block text-sm font-bold mb-2 uppercase tracking-wider">Name</label>
                        <input
                            id='name'
                            type='text'
                            placeholder='Name of the campaign'
                            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring focus:border-blue-300 transition duration-200"
                            value={name}
                            onChange={onNameChange}
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor='description' className="block text-sm font-bold mb-2 uppercase tracking-wider">Description</label>
                        <textarea
                            id='description'
                            placeholder='Description of the campaign'
                            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring focus:border-blue-300 transition duration-200"
                            value={description}
                            onChange={onDescriptionChange}
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor='goal' className="block text-sm font-bold mb-2 uppercase tracking-wider">Goal</label>
                        <input
                            id='goal'
                            type='number'
                            placeholder='Goal'
                            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring focus:border-blue-300 transition duration-200"
                            value={goal}
                            onChange={onGoalChange}
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor='duration' className="block text-sm font-bold mb-2 uppercase tracking-wider">Duration</label>
                        <input
                            id='duration'
                            type='number'
                            placeholder='Duration in days'
                            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring focus:border-blue-300 transition duration-200"
                            value={duration}
                            onChange={onDurationChange}
                        />
                    </div>
                    <div className="flex justify-center mt-6">
                        <button
                            type='submit'
                            className="btn bg-gradient-to-br from-indigo-500 to-fuchsia-500 border-2 border-[#5252529f] text-white px-6 py-3 rounded-md shadow-sm hover:bg-gradient-to-bl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition duration-200"
                        >
                            Create Campaign
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );     
};

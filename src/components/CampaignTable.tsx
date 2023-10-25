import { useEffect, useState, FC } from 'react';
import { BN, Program, ProgramAccount, AnchorProvider} from '@project-serum/anchor';
import { PublicKey} from '@solana/web3.js';
import { Table } from 'react-bootstrap';
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

    const getAllCampaigns = async () => {
        try{
            const fetchedCampaigns = await program.account.campaign.all();
            setCampaigns(fetchedCampaigns);
        } catch(error) {
            console.error("Error while getting the campaigns")
        }
    };

    useEffect(() => {
        getAllCampaigns();
    }, [walletKey, program]);

    return (
        <>
            <div>Campaigns</div>
            <Table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Target Amount</th>
                        <th>Donated</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {campaigns.map((c, i) => (
                        <tr key={c.publicKey.toBase58()}>
                            <td>{i + 1}</td>
                            <td>{c.account.name}</td>
                            <td>{c.account.description}</td>
                            <td>{c.account.goal.toString()}</td>
                            <td>{c.account.duration.toString()}</td>
                            <td>{c.account.endCampaign.toString()}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
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
        try{
            const anchProvider = await getProvider();
            const program = new Program(idl_object, programID, anchProvider);
            setProgram(program);
        } catch(error){
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


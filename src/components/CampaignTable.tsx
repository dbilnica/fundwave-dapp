import React, { useEffect, useState, ChangeEvent } from 'react';
import { FC } from "react";
import { BN, Program, ProgramAccount, web3, AnchorProvider, Idl, utils } from '@project-serum/anchor';
import { PublicKey, Commitment, Connection } from '@solana/web3.js';
import { Button, Table } from 'react-bootstrap';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

import idl from "../components/crowdfunding_dapp.json";

const programId = new PublicKey(idl.metadata.address);

// ----------- CampaignsTable Component ------------
interface CampaignsTableProps {
    program: Program;
    walletKey: PublicKey;
}

export const CampaignsTable: React.FC<CampaignsTableProps> = ({
    program,
    walletKey,
}) => {
    const [campaigns, setCampaigns] = useState<ProgramAccount[]>([]);

    const getAllCampaigns = async () => {
        const campaigns = await program.account.campaign.all();
        setCampaigns(campaigns);
    };

    useEffect(() => {
        getAllCampaigns();
    }, [walletKey]);

    const allCampaigns: () => JSX.Element[] = () => {
        return campaigns.map((c, i) => {
            const key = c.publicKey.toBase58();

            return (
                <tr key={key}>
                    <td>{i + 1}</td>
                    <td>{c.account.name}</td>
                    <td>{c.account.description}</td>
                    <td>{c.account.goal.toString()}</td>
                    <td>{c.account.duration.toString()}</td>
                    <td>{c.account.endCampaign.toString()}</td>
                </tr>
            );
        });
    };

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
                <tbody>{allCampaigns()}</tbody>
            </Table>
        </>
    );
};

export const ShowCampaigns: FC = ({ }) => {
    const wallet = useWallet();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [targetAmount, setTargetAmount] = useState<number>(1);

    const getProgram = () => {
        const { connection } = useConnection();
        const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
        const program = new Program(idl as Idl, programId, provider);
        return program;
    };

    const program = getProgram();
    return (
        <div className='campaigns-view p-5'>
            {!wallet.connected && <WalletMultiButton />}
            {wallet.connected && <CampaignsTable walletKey={wallet.publicKey!} program={program} />}
        </div>
    );
};

export default ShowCampaigns;

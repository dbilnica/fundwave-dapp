import { FC } from 'react';
import Text from './Text';
import NavElement from './nav-element';
import React, { useState, useEffect } from "react";
import idl from "@/components/idl/crowdfunding_dapp.json";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Program,
  AnchorProvider,
} from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.metadata.address);

interface Props {
  children: React.ReactNode;
  program: Program;
  walletKey: PublicKey;
  adminPubkey: String;
}

export const ContentContainer: React.FC<Props> = ({ children }) => {
  const ourWallet = useWallet();
  const [walletConnected, setWalletConnected] = useState<boolean | null>(null);
  const { connection } = useConnection();
  const [adminPublicKey, setAdminPublicKey] = useState(null);
  const [userPublicKey, setUserPublicKey] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [program, setProgram] = useState<Program | null>(null);
  const getProvider = async (): Promise<AnchorProvider> => {
    const provider = new AnchorProvider(
      connection,
      ourWallet,
      AnchorProvider.defaultOptions()
    );
    return provider;
  };

  const getAdminPubkey = async () => {
    try {
      const anchProvider = await getProvider();
      const program = new Program(idl_object, programID, anchProvider);
      const adminAccounts = await program.account.admin.all();

      if (adminAccounts.length > 0) {
        const adminPubkey = new PublicKey(
          (adminAccounts[0].account as Props).adminPubkey
        );
        setAdminPublicKey(adminPubkey);
      } else {
        console.log("No admin accounts found.");
      }
    } catch (error) {
      console.error("Failed to fetch admin public key:", error);
    }
  };

  const getUserPubkey = async () => {
    try {
      const anchProvider = await getProvider();
      if (anchProvider.wallet.publicKey) {
        const signerPubkey = anchProvider.wallet.publicKey;
        setUserPublicKey(signerPubkey);
      } else {
        console.log("Wallet is not connected.");
      }
    } catch (error) {
      console.error("Failed to fetch user public key:", error);
    }
  };

  const getAllCampaigns = async () => {
    try {
      const fetchedCampaigns = await program.account.campaign.all();
      const userPublicKeyString = userPublicKey?.toString();

      const userOwnedCampaign = fetchedCampaigns.find(
        ({ account }) => account.owner.toBase58() === userPublicKeyString
      );

      if (userOwnedCampaign) {
        setHasPortfolio(true);
      } else {
        setHasPortfolio(false);
      }
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    }
  };

  useEffect(() => {
    const initProgram = async () => {
      try {
        if (!ourWallet.connected || !ourWallet.publicKey) return;
        const anchProvider = await getProvider();
        const programInstance = new Program(
          idl_object,
          programID,
          anchProvider
        );
        setProgram(programInstance);
      } catch (error) {
        console.error("Failed to initialize the program:", error);
      }
    };

    initProgram();
  }, [ourWallet.connected, ourWallet.publicKey, connection]);

  useEffect(() => {
    if (program && userPublicKey) {
      getAllCampaigns();
    }
  }, [program, userPublicKey]);

  useEffect(() => {
    if (ourWallet.connected && ourWallet.publicKey) {
      getAdminPubkey();
      getUserPubkey();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ourWallet]);

  useEffect(() => {
    if (userPublicKey && adminPublicKey) {
      setIsAdmin(userPublicKey.equals(adminPublicKey));
    }
  }, [userPublicKey, adminPublicKey]);

  useEffect(() => {
    if (ourWallet.connected) {
      setWalletConnected(true);
    } else {
      setWalletConnected(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ourWallet.connected]);

  if (walletConnected === null) {
    return null;
  }

  return (
    <div className="flex-1 drawer h-52 flex-col justify-between">
      <input id="my-drawer" type="checkbox" className="grow drawer-toggle" />
      <div className="items-center drawer-content flex flex-col justify-between">
        {children}
      </div>
      {/* SideBar / Drawer */}
      <div className="drawer-side">
        <label htmlFor="my-drawer" className="drawer-overlay gap-6"></label>

        <ul className="p-4 overflow-y-auto menu w-80 bg-base-100 gap-10 sm:flex items-center">
          <li>
            <Text variant="heading" className='font-extrabold tracking-tighter text-center text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500 mt-10'>Menu</Text>
          </li>
          <li>
            <NavElement
            label="Campaigns"
            href="/"
            />
          </li>
          <li>
            <NavElement
            label="Create Campaign"
            href="/create"
            />
          </li>

          <li>
          {hasPortfolio && (
            <NavElement
              label="Portfolio"
              href="/portfolio"
            />
            )}
          </li>
          <li>
          {isAdmin && (
            <NavElement
              label="Admin"
              href="/admin"
            />
            )}
          </li>
        </ul>
      </div>
    </div >
  );
};

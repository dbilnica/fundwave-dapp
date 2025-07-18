import { FC } from "react";
import Text from "./Text";
import NavElement from "./nav-element";
import React, { useState, useEffect, useCallback } from "react";
import idl from "@/components/idl/crowdfunding_dapp.json";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import styles from "@/styles/ContentContainer.module.css";

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.metadata.address);

interface Props {
  children: React.ReactNode;
}

interface IDLProps {
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

  const getProvider = useCallback(async (): Promise<AnchorProvider> => {
    const provider = new AnchorProvider(
      connection,
      ourWallet,
      AnchorProvider.defaultOptions()
    );
    return provider;
  }, [connection, ourWallet]);

  const toggleDrawer = () => {
    const drawer = document.getElementById("my-drawer") as HTMLInputElement;
    if (drawer) {
      drawer.checked = !drawer.checked;
    }
  };

  const getAdminPubkey = async () => {
    try {
      const anchProvider = await getProvider();
      const program = new Program(idl_object, programID, anchProvider);
      const adminAccounts = await program.account.admin.all();

      if (adminAccounts.length > 0) {
        const adminPubkey = new PublicKey(
          (adminAccounts[0].account as IDLProps).adminPubkey
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

  const getAllCampaigns = useCallback(async () => {
    try {
      if (!program || !userPublicKey) return;

      const fetchedCampaigns = await program.account.campaign.all();
      const userPublicKeyString = userPublicKey.toString();

      const userOwnedCampaign = fetchedCampaigns.find(
        ({ account }) => account.owner.toBase58() === userPublicKeyString
      );

      setHasPortfolio(!!userOwnedCampaign);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    }
  }, [program, userPublicKey]);

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
  }, [ourWallet.connected, ourWallet.publicKey, connection, getProvider]);

  useEffect(() => {
    if (program && userPublicKey) {
      getAllCampaigns();
    }
  }, [program, userPublicKey, getAllCampaigns]);

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
    <div
      className={`flex-1 drawer h-full flex-col justify-between ${styles.drawerContainer}`}
    >
      <input
        id="my-drawer"
        type="checkbox"
        className={`drawer-toggle ${styles.drawerToggle}`}
      />
      <div
        className={`drawer-content flex flex-col justify-between ${styles.drawerContent}`}
      >
        <button
          onClick={toggleDrawer}
          className="btn btn-square btn-ghost md:hidden"
        ></button>
        {children}
      </div>
      {/* SideBar / Drawer */}
      <div className={`drawer-side ${styles.drawerSide}`}>
        <label htmlFor="my-drawer" className="drawer-overlay"></label>

        <ul className="menu p-4 overflow-y-auto w-80 bg-base-100">
          <li>
            <Text
              variant="heading"
              className="font-extrabold tracking-tighter text-center text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500 mt-20"
            >
              Menu
            </Text>
          </li>
          <li>
            <NavElement label="Campaigns" href="/" />
          </li>
          {walletConnected ? (
            <>
              {!isAdmin && !hasPortfolio && (
                <li>
                  <NavElement label="Create Campaign" href="/create" />
                </li>
              )}
              {hasPortfolio && (
                <li>
                  <NavElement label="Portfolio" href="/portfolio" />
                </li>
              )}
              {isAdmin && (
                <li>
                  <NavElement label="Admin" href="/admin" />
                </li>
              )}
            </>
          ) : (
            <li>
              <NavElement label="Download Wallet" href="https://phantom.app/" />
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

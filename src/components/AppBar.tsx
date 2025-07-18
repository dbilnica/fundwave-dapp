import { FC } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import React, { useState, useEffect, useCallback } from "react";
import { useAutoConnect } from "../contexts/AutoConnectProvider";
import NetworkSwitcher from "./NetworkSwitcher";
import NavElement from "./nav-element";
import idl from "@/components/idl/crowdfunding_dapp.json";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import styles from "@/styles/AppBar.module.css";

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.metadata.address);

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

interface AccountsProps {
  program: Program;
  walletKey: PublicKey;
  adminPubkey: String;
}

export const AppBar: FC = () => {
  const { autoConnect, setAutoConnect } = useAutoConnect();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const ourWallet = useWallet();
  const [walletConnected, setWalletConnected] = useState<boolean | null>(null);
  const { connection } = useConnection();
  const [adminPublicKey, setAdminPublicKey] = useState(null);
  const [userPublicKey, setUserPublicKey] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDownloadButton, setShowDownloadButton] = useState(false);
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [showNavElements, setShowNavElements] = useState(false);

  const getProvider = useCallback(async (): Promise<AnchorProvider> => {
    const provider = new AnchorProvider(
      connection,
      ourWallet,
      AnchorProvider.defaultOptions()
    );
    return provider;
  }, [connection, ourWallet]);

  const getAdminPubkey = async () => {
    try {
      const anchProvider = await getProvider();
      const program = new Program(idl_object, programID, anchProvider);
      const adminAccounts = await program.account.admin.all();

      if (adminAccounts.length > 0) {
        const adminPubkey = new PublicKey(
          (adminAccounts[0].account as AccountsProps).adminPubkey
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
    const timer = setTimeout(() => {
      setShowDownloadButton(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

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
    if (walletConnected) {
      setShowDownloadButton(false);
    }
  }, [walletConnected]); //

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

  useEffect(() => {
    const delay = setTimeout(() => {
      setShowNavElements(true);
    }, 200);

    return () => clearTimeout(delay);
  }, []);

  if (walletConnected === null) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-10">
      <div
        className={`navbar ${styles.navbar} flex h-20 flex-row md:mb-2 shadow-lg bg-black text-neutral-content border-b border-zinc-600 bg-opacity-66`}
      >
        <div
          className={`navbar-start ${styles.navbarStart} align-items-center`}
        >
          <div className="hidden sm:inline w-22 h-22 md:p-2 ml-10">
            <div className="flex flex-row ml-1">
              <Link href="/">
                <Image
                  src="/fundwaveLogo.png"
                  alt="fundwave logo"
                  width={220}
                  height={96}
                  style={{ cursor: "pointer" }}
                  priority
                />
              </Link>
            </div>
          </div>
        </div>

        <div
          className={`navbar-center ${styles.navbarCenter} flex-grow justify-center hidden md:flex gap-6`}
        >
          {showNavElements && (
            <>
              <NavElement
                label="Campaigns"
                href="/"
                navigationStarts={() => setIsNavOpen(false)}
              />
              {walletConnected && (
                <>
                  {!isAdmin && !hasPortfolio && (
                    <NavElement
                      label="Create Campaign"
                      href="/create"
                      navigationStarts={() => setIsNavOpen(false)}
                    />
                  )}
                  {hasPortfolio && (
                    <NavElement
                      label="Portfolio"
                      href="/portfolio"
                      navigationStarts={() => setIsNavOpen(false)}
                    />
                  )}
                  {isAdmin && (
                    <NavElement
                      label="Admin"
                      href="/admin"
                      navigationStarts={() => setIsNavOpen(false)}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
        <div className={`navbar-end ${styles.navbarEnd}`}>
          {!walletConnected && showDownloadButton && (
            <a
              href="https://phantom.app/"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.downloadWallet} btn btn-primary text-lg mr-6`}
            >
              Download Wallet
            </a>
          )}
          <WalletMultiButtonDynamic className="btn-ghost btn-sm rounded-btn text-lg mr-6 " />
        </div>
        <label
          htmlFor="my-drawer"
          className="btn-gh items-center justify-between md:hidden mr-6"
          onClick={() => setIsNavOpen(!isNavOpen)}
        >
          <div className="HAMBURGER-ICON space-y-2.5 ml-5">
            <div
              className={`h-0.5 w-8 bg-purple-600 ${isNavOpen ? "hidden" : ""}`}
            />
            <div
              className={`h-0.5 w-8 bg-purple-600 ${isNavOpen ? "hidden" : ""}`}
            />
            <div
              className={`h-0.5 w-8 bg-purple-600 ${isNavOpen ? "hidden" : ""}`}
            />
          </div>
          <div
            className={`absolute block h-0.5 w-8 animate-pulse bg-purple-600 ${
              isNavOpen ? "" : "hidden"
            }`}
            style={{ transform: "rotate(45deg)" }}
          ></div>
          <div
            className={`absolute block h-0.5 w-8 animate-pulse bg-purple-600 ${
              isNavOpen ? "" : "hidden"
            }`}
            style={{ transform: "rotate(135deg)" }}
          ></div>
        </label>
        <div>
          <span className="absolute block h-0.5 w-12 bg-zinc-600 rotate-90 right-14"></span>
        </div>
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            className="btn btn-square btn-ghost text-right mr-4"
          >
            <svg
              className="w-7 h-7"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="p-2 shadow menu dropdown-content bg-base-100 rounded-box sm:w-52"
          >
            <li>
              <div className="form-control bg-opacity-100">
                <label className="cursor-pointer label">
                  <a>Autoconnect</a>
                  <input
                    type="checkbox"
                    checked={autoConnect}
                    onChange={(e) => setAutoConnect(e.target.checked)}
                    className="toggle"
                  />
                </label>
              </div>
              <NetworkSwitcher />
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

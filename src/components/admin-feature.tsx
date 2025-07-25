import { useEffect, useState, FC, useMemo, useCallback } from "react";
import {
  Program,
  ProgramAccount,
  AnchorProvider,
  web3,
  utils,
} from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "@/components/idl/crowdfunding_dapp.json";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import Image from "next/image";
import Link from "next/link";
import { SearchIcon } from "@heroicons/react/outline";
import SearchAndToggleAdmin from "@/utils/SearchAndToggleAdmin";
import { shortenAddress } from "@/utils/shortenAddress";
import { lamportsToSol } from "@/utils/lamportsToSol";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styles from "@/styles/AdminFeature.module.css";

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.metadata.address);

interface CampaignsTableProps {
  program: Program;
  walletKey: PublicKey;
}

export const AdminTable: FC<CampaignsTableProps> = ({ program }) => {
  const [campaigns, setCampaigns] = useState<ProgramAccount[]>([]);
  const [adminExists, setAdminExists] = useState<boolean>(false);
  const ourWallet = useWallet();
  const { connection } = useConnection();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isReviewedToggled, setIsReviewedToggled] = useState(false);
  const [isCanceledToggled, setIsCanceledToggled] = useState(false);
  const toggleReviewedCampaignsView = () =>
    setIsReviewedToggled((prev) => !prev);
  const toggleCanceledCampaignsView = () =>
    setIsCanceledToggled((prev) => !prev);

  const [pubkeyNewAdminInput, setPubkeyNewAdminInput] = useState("");

  const onPubkeyNewAdminInputChange = (event) => {
    setPubkeyNewAdminInput(event.target.value);
  };

  const getProvider = useCallback(async () => {
    const provider = new AnchorProvider(
      connection,
      ourWallet,
      AnchorProvider.defaultOptions()
    );
    return provider;
  }, [connection, ourWallet]);

  const getAdminPubkey = useCallback(async () => {
    try {
      const anchProvider = await getProvider();
      const program = new Program(idl_object, programID, anchProvider);
      const adminAccounts = await program.account.admin.all();
      setAdminExists(adminAccounts.length > 0);
    } catch (error) {
      console.error("Error fetching admin accounts:", error);
      setAdminExists(false);
    }
  }, [getProvider]);

  const getAllCampaigns = useCallback(async () => {
    if (program && program.account && program.account.campaign) {
      try {
        const fetchedCampaigns = await program.account.campaign.all();
        const validCampaigns = fetchedCampaigns.filter(
          (c) => c.account !== null
        );

        validCampaigns.sort(
          (a, b) =>
            a.account.duration.toNumber() - b.account.duration.toNumber()
        );

        setCampaigns(validCampaigns);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching campaigns:", error);
        setIsLoading(true);
      }
    } else {
      console.log("Program not initialized");
    }
  }, [program]);

  const reviewCampaign = async (publicKey) => {
    try {
      const anchProvider = await getProvider();
      const program = new Program(idl_object, programID, anchProvider);

      const [admin] = await PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("admin_account")],
        program.programId
      );

      const campaignToReview = campaigns.find(
        (c) => c.publicKey.toBase58() === publicKey.toBase58()
      );
      await program.methods
        .campaignReview()
        .accounts({
          campaign: publicKey,
          admin,
          user: anchProvider.wallet.publicKey,
        })
        .rpc();
      toast.success(
        `Campaign "${campaignToReview.account.name}" has been successfully reviewed!`
      );
      console.log(
        `Campaign "${campaignToReview.account.name}" has been successfully reviewed!`
      );
      await getAllCampaigns();
    } catch (error) {
      toast.error("Error while reviewing " + publicKey);
      console.log("Error while reviewing: ", error);
    }
  };

  const cancelCampaign = async (publicKey) => {
    try {
      const anchProvider = await getProvider();
      const program = new Program(idl_object, programID, anchProvider);

      const [admin] = await PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("admin_account")],
        program.programId
      );

      const campaignToCancel = campaigns.find(
        (c) => c.publicKey.toBase58() === publicKey.toBase58()
      );

      await program.methods
        .campaignCancel()
        .accounts({
          campaign: publicKey,
          admin,
          user: anchProvider.wallet.publicKey,
        })
        .rpc();
      toast.success(
        `Campaign "${campaignToCancel.account.name}" has been successfully canceled!`
      );
      console.log(
        `Campaign "${campaignToCancel.account.name}" has been successfully canceled!`
      );
      await getAllCampaigns();
    } catch (error) {
      toast.error("Error while cancelling " + publicKey);
      console.log("Error while cancelling: ", error);
    }
  };
  const initAdmin = async () => {
    try {
      const anchProvider = await getProvider();
      const program = new Program(idl_object, programID, anchProvider);
      const signerPubkey = anchProvider.wallet.publicKey;

      const [admin] = await PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("admin_account")],
        program.programId
      );

      console.log(admin.toBase58());
      console.log(program.programId.toBase58());
      console.log(signerPubkey.toBase58());

      await program.methods
        .adminInitialize()
        .accounts({
          admin,
          user: signerPubkey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      toast.success("Admin initialized successfully!");
      console.log("Admin initialized successfully");
      await getAdminPubkey();
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

      const [currentAdmin] = await PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("admin_account")],
        program.programId
      );

      console.log(currentAdmin.toBase58());
      console.log(program.programId.toBase58());
      console.log(signerPubkey.toBase58());

      await program.methods
        .ownershipTransfer(newAdminPubkey)
        .accounts({
          currentAdmin,
          user: signerPubkey,
        })
        .rpc();
      toast.success("Ownership has been transfered successfully!");
      console.log("Ownership has been transfered successfully");
    } catch (error) {
      toast.error("Error while transfering the ownership!");
      console.error("Error while transfering the ownership: ", error);
    }
  };

  const handleAdminInit = (e) => {
    e.preventDefault();
    initAdmin();
  };

  const handleTransferOwnership = (e) => {
    e.preventDefault();
    transferOwnership();
  };

  const Loader = () => (
    <span className="loading loading-spinner loading-lg"></span>
  );

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const { isActive, isCanceled } = campaign.account ?? {
        isActive: false,
        isCanceled: false,
      };
      const matchesSearchQuery =
        searchQuery.trim() === "" ||
        campaign.account.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        campaign.account.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      if (isReviewedToggled && isCanceledToggled) {
        return matchesSearchQuery && (isActive || isCanceled);
      } else if (isReviewedToggled) {
        return matchesSearchQuery && isActive;
      } else if (isCanceledToggled) {
        return matchesSearchQuery && isCanceled;
      }
      return !isActive && !isCanceled && matchesSearchQuery;

    });
  }, [campaigns, isReviewedToggled, isCanceledToggled, searchQuery]);

  const noCampaignsAvailable = !isLoading && filteredCampaigns.length === 0;

  useEffect(() => {
    if (program) {
      getAllCampaigns();
    }
  }, [program, getAllCampaigns]);

  useEffect(() => {
    getAdminPubkey();
  }, [getAdminPubkey]);

  if (isLoading) {
    return <Loader />;
  }

  const CampaignCard: FC<{ campaign: ProgramAccount }> = ({ campaign }) => {
    const campaignId = campaign.publicKey.toBase58();
    const [imageLoading, setImageLoading] = useState(true);
    const { isActive, isCanceled } = campaign.account;
    const [showImage, setShowImage] = useState(false);
    const ipfsProviders = [
      "https://dweb.link/ipfs/",
      "https://gateway.pinata.cloud/ipfs/",
    ];
    const goalInSol = lamportsToSol(campaign.account.goal).toFixed(2);
    const explorerBaseUrl = "https://explorer.solana.com";
    const networkParam = "?cluster=devnet";
    const ownerPubkey = campaign.account.owner.toString();
    const explorerUrl = `${explorerBaseUrl}/address/${ownerPubkey}${networkParam}`;
    const shortenedOwnerPubkey = shortenAddress(ownerPubkey);

    const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
    const durationInDays = Math.floor(
      campaign.account.duration.toNumber() / (60 * 60 * 24)
    );
    const computeImageUrl = () => {
      const baseUri = ipfsProviders[currentGatewayIndex % ipfsProviders.length];
      return `${baseUri}${campaign.account.imageIpfsHash}`;
    };

    const handleImageError = () => {
      console.error(
        `Error loading image from gateway ${currentGatewayIndex}. Trying next gateway.`
      );
      setCurrentGatewayIndex(
        (prevIndex) => (prevIndex + 1) % ipfsProviders.length
      );
      setImageLoading(false);
    };

    useEffect(() => {
      const timeoutId = setTimeout(() => {
        setShowImage(true);
      }, 500);
      return () => clearTimeout(timeoutId);
    }, [campaign.account.imageIpfsHash]);

    return (
      <>
        <div className={`card w-96 bg-base-100 shadow-xl m-2`}>
          <Link href={`/campaign/${campaignId}`} passHref>
            <figure className="px-10 pt-10 relative">
              {imageLoading && <Loader />}
              {showImage && (
                <div
                  className="overflow-hidden"
                  style={{ borderRadius: "0.5rem" }}
                >
                  <Image
                    src={computeImageUrl()}
                    alt="Campaign Image"
                    width={500}
                    height={300}
                    onLoad={() => setImageLoading(false)}
                    onError={handleImageError}
                  />
                </div>
              )}
            </figure>
          </Link>
          <div className="card-body flex flex-col">
            <Link href={`/campaign/${campaignId}`} passHref>
              <h2
                className="line-clamp-2 card-title text-left text-2xl font-bold mb-1"
                style={{ textTransform: "uppercase" }}
              >
                {campaign.account.name}
              </h2>
              <p className="line-clamp-3 text-left text-lg mb-4 flex-grow">
                {campaign.account.description}
              </p>
            </Link>
            <div className="mt-auto">
              <div className="flex justify-between items-center text-center">
                <div className="flex-1">
                  <p className="text-lg font-bold">{goalInSol} SOL</p>
                  <span className="text-sm">goal</span>
                </div>
                <div className="flex-1 border-l border-gray-300">
                  <p className="text-lg font-bold">{durationInDays} days</p>
                  <span className="text-sm">duration</span>
                </div>
              </div>
              <div className="flex-1 mt-2 mb-2">
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-indigo-700 hover:text-indigo-900 visited:text-purple-700"
                >
                  {shortenedOwnerPubkey}
                </a>
              </div>
              <div className="card-actions justify-center mt-4">
                {!isActive && !isCanceled && (
                  <>
                    <button
                      onClick={() => reviewCampaign(campaign.publicKey)}
                      className={`btn ${styles.btnReview} text-xl font-semibold ml-2`}
                    >
                      Review
                    </button>
                    <button
                      onClick={() => cancelCampaign(campaign.publicKey)}
                      className={`btn ${styles.btnCancel} text-xl font-semibold ml-2`}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {isActive && !isCanceled && (
                  <>
                    <div className="card-actions justify-center">
                      <Link href={`/campaign/${campaignId}`} passHref>
                        <button
                          className="btn btn-wide text-xl font-semibold ml-2"
                          style={{ width: "100%" }}
                        >
                          Campaign Reviewed
                        </button>
                      </Link>
                    </div>
                  </>
                )}
                {isCanceled && (
                  <>
                    <div className="card-actions justify-center">
                      <Link href={`/campaign/${campaignId}`} passHref>
                        <button
                          className="btn btn-wide text-xl font-semibold ml-2"
                          style={{ width: "100%" }}
                        >
                          Campaign Canceled
                        </button>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  if (!adminExists) {
    return (
      <>
        <ToastContainer position="bottom-center" />
        <div className="mb-6">
          <button
            className="btn btn-wide text-2xl font-bold"
            onClick={handleAdminInit}
          >
            Initialize Admin
          </button>
        </div>
      </>
    );
  }
  return (
    <>
      <ToastContainer position="bottom-center" />
      <div className="search-toggle">
        {!showSearch && (
          <button
            className="search-button"
            onClick={() => setShowSearch(!showSearch)}
            aria-label="Toggle search"
          >
            <SearchIcon className="h-10 w-10 text-white" />
          </button>
        )}
      </div>
      {showSearch && (
        <SearchAndToggleAdmin
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          pubkeyNewAdminInput={pubkeyNewAdminInput}
          onPubkeyNewAdminInputChange={onPubkeyNewAdminInputChange}
          handleTransferOwnership={handleTransferOwnership}
          toggleReviewedCampaignsView={toggleReviewedCampaignsView}
          toggleCanceledCampaignsView={toggleCanceledCampaignsView}
          isReviewedToggled={isReviewedToggled}
          isCanceledToggled={isCanceledToggled}
          onClose={() => setShowSearch(false)}
        />
      )}
      <div className="flex flex-wrap justify-start">
        {noCampaignsAvailable ? (
          <p className="text-center w-full text-lg mt-5 font-bold">No campaigns to load</p>
        ) : (
          filteredCampaigns.map((c) => (
            <CampaignCard key={c.publicKey.toBase58()} campaign={c} />
          ))
        )}
      </div>
    </>
  );
};

export const ShowAdmin: FC = () => {
  const ourWallet = useWallet();
  const { connection } = useConnection();
  const [program, setProgram] = useState<Program | null>(null);

  const initializeProgram = useCallback(async () => {
    const getProvider = async (): Promise<AnchorProvider> => {
      const provider = new AnchorProvider(
        connection,
        ourWallet,
        AnchorProvider.defaultOptions()
      );
      return provider;
    };

    try {
      const anchProvider = await getProvider();
      const program = new Program(idl_object, programID, anchProvider);
      setProgram(program);
    } catch (error) {
      console.error("Error while program initialization:", error);
    }
  }, [connection, ourWallet]);

  useEffect(() => {
    initializeProgram();
  }, [initializeProgram]);

  return (
    <div className="campaigns-view p-5">
      <AdminTable walletKey={ourWallet.publicKey!} program={program} />
    </div>
  );
};

export default ShowAdmin;

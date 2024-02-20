import { useEffect, useState, FC, useMemo, useCallback} from "react";
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

export const AdminTable: FC<CampaignsTableProps> = ({ program, walletKey }) => {
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
      setAdminExists(adminAccounts.length > 0);
    } catch (error) {
      console.error("Error fetching admin accounts:", error);
      setAdminExists(false);
    }
  };

  const getAllCampaigns = useCallback(async () => {
    try {
      const fetchedCampaigns = await program.account.campaign.all();
      fetchedCampaigns.sort(
        (a, b) => a.account.duration.toNumber() - b.account.duration.toNumber()
      );
  
      setCampaigns(fetchedCampaigns);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      setIsLoading(true);
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
      console.log("Campaign has been successfully reviewed " + publicKey);
    } catch (error) {
      console.log("Error while reviewing");
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
    } catch (error) {
      toast.error("Campaign has been successfully canceled " + publicKey);
      console.log("Error while cancelling");
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
      const { isActive, isCanceled } = campaign.account;

      if (isReviewedToggled && !isCanceledToggled) {
        return isActive && !isCanceled;
      } else if (!isReviewedToggled && isCanceledToggled) {
        return isCanceled;
      }
      return true;
    });
  }, [campaigns, isReviewedToggled, isCanceledToggled]);

  useEffect(() => {
    getAllCampaigns();
  }, [getAllCampaigns]);

  useEffect(() => {
    getAdminPubkey();
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  const CampaignCard: FC<{ campaign: ProgramAccount }> = ({ campaign }) => {
    const campaignId = campaign.publicKey.toBase58();
    const [imageLoading, setImageLoading] = useState(true);
    const { isActive, isCanceled } = campaign.account;
    const [showImage, setShowImage] = useState(false);
    const ipfsProviders = [
      "https://ipfs.io/ipfs/",
      "https://gateway.pinata.cloud/ipfs/",
      "https://dweb.link/ipfs/",
    ];

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
                  <p className="text-lg font-bold">
                    {campaign.account.goal.toString()} SOL
                  </p>
                  <span className="text-sm">goal</span>
                </div>
                <div className="flex-1 border-l border-gray-300">
                  <p className="text-lg font-bold">{durationInDays} days</p>
                  <span className="text-sm"></span>
                </div>
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
          setIsReviewedToggled={setIsReviewedToggled}
          isCanceledToggled={isCanceledToggled}
          setIsCanceledToggled={setIsCanceledToggled}
          onClose={() => setShowSearch(false)}
        />
      )}
      <div className="flex flex-wrap justify-start">
        {filteredCampaigns.map((c) => (
          <CampaignCard key={c.publicKey.toBase58()} campaign={c} />
        ))}
      </div>
    </>
  );
};

export const ShowAdmin: FC = () => {
  const ourWallet = useWallet();
  const { connection } = useConnection();
  const [program, setProgram] = useState<Program | null>(null);

  const getProvider = async (): Promise<AnchorProvider> => {
    const provider = new AnchorProvider(
      connection,
      ourWallet,
      AnchorProvider.defaultOptions()
    );
    return provider;
  };

  const initializeProgram = async () => {
    try {
      const anchProvider = await getProvider();
      const program = new Program(idl_object, programID, anchProvider);
      setProgram(program);
    } catch (error) {
      console.error("Error while program initialization");
    }
  };

  useEffect(() => {
    initializeProgram();
  }, [ourWallet, connection]);

  return (
    <div className="campaigns-view p-5">
      <AdminTable walletKey={ourWallet.publicKey!} program={program} />
    </div>
  );
};

export default ShowAdmin;

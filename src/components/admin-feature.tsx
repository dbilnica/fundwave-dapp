import { useEffect, useState, FC } from "react";
import {
  BN,
  Program,
  ProgramAccount,
  AnchorProvider,
  web3,
  utils,
  getProvider,
} from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "@/components/idl/crowdfunding_dapp.json";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import Image from "next/image";
import Link from "next/link";
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

  const calculateTimeRemaining = (endTimestamp) => {
    const now = new Date().getTime();
    const distance = endTimestamp - now;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    return {
      days,
      hours,
      minutes,
      seconds,
      distance,
    };
  };

  const [pubkeyInput, setPubkeyInput] = useState("");
  const [pubkeyNewAdminInput, setPubkeyNewAdminInput] = useState("");

  const onPubkeyInputChange = (event) => {
    setPubkeyInput(event.target.value);
  };

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

  const getAllCampaigns = async () => {
    try {
      const fetchedCampaigns = await program.account.campaign.all();

      const currentTime = new Date().getTime();

      const ongoingCampaigns = fetchedCampaigns.filter(
        (campaign) =>
          new Date(campaign.account.endCampaign.toNumber() * 1000).getTime() >
          currentTime
      );
      const endedCampaigns = fetchedCampaigns.filter(
        (campaign) =>
          new Date(campaign.account.endCampaign.toNumber() * 1000).getTime() <=
          currentTime
      );

      ongoingCampaigns.sort((a, b) => {
        return (
          a.account.endCampaign.toNumber() - b.account.endCampaign.toNumber()
        );
      });

      endedCampaigns.sort((a, b) => {
        return (
          b.account.endCampaign.toNumber() - a.account.endCampaign.toNumber()
        );
      });

      const sortedCampaigns = ongoingCampaigns.concat(endedCampaigns);

      setCampaigns(sortedCampaigns);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(true);
    }
  };

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

  const Countdown: FC<{ endTime: number }> = ({ endTime }) => {
    const [timeLeft, setTimeLeft] = useState(() =>
      calculateTimeRemaining(endTime)
    );

    useEffect(() => {
      const timer = setInterval(() => {
        const newTimeLeft = calculateTimeRemaining(endTime);
        setTimeLeft(newTimeLeft);
      }, 1000);

      return () => clearInterval(timer);
    }, [endTime]);

    const formatRemainingTime = () => {
      if (timeLeft.distance <= 0) {
        return "ended";
      } else if (timeLeft.days > 0) {
        return `${timeLeft.days} days`;
      } else {
        return `${timeLeft.hours}h ${timeLeft.minutes}m`;
      }
    };

    return <div>{formatRemainingTime()}</div>;
  };

  useEffect(() => {
    getAllCampaigns();
  }, [walletKey, program]);

  useEffect(() => {
    getAdminPubkey();
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  const CampaignCard: FC<{ campaign: ProgramAccount }> = ({ campaign }) => {
    const campaignId = campaign.publicKey.toBase58();
    const endTime = new Date(
      campaign.account.endCampaign.toNumber() * 1000
    ).getTime();
    const [imageLoading, setImageLoading] = useState(true);
    const [showImage, setShowImage] = useState(false);
    const ipfsProviders = [
      "https://ipfs.io/ipfs/",
      "https://gateway.pinata.cloud/ipfs/",
      "https://dweb.link/ipfs/",
    ];

    const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);

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
        <div className="card w-96 bg-base-100 shadow-xl m-2">
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
                    onLoad={() => {
                      setImageLoading(false);
                    }}
                    onError={() => {
                      console.error("Image failed to load");
                      handleImageError();
                    }}
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
              <div className="flex justify-between items-center text-cente">
                <div className="flex-1">
                  <p className="text-lg font-bold">
                    {campaign.account.goal.toString()} SOL
                  </p>
                  <span className="text-sm">goal</span>
                </div>
                <div className="flex-1 border-l border-gray-300">
                  <Countdown endTime={endTime} />
                  <span className="text-sm">duration</span>
                </div>
              </div>
              <div className="card-actions justify-center mt-4">
                <button
                  onClick={() => cancelCampaign(campaign.publicKey)}
                  className={`btn ${styles.btnCancel} text-xl font-semibold ml-2`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => reviewCampaign(campaign.publicKey)}
                  className={`btn ${styles.btnReview} text-xl font-semibold ml-2`}
                >
                  Review
                </button>
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
        <ToastContainer position="top-center" />
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
      <ToastContainer position="top-center" />
      <div className="flex justify-center items-center mb-8 flex-col sm:flex-row">
        <input
          id="new-admin-pubkey"
          type="text"
          placeholder="Enter new admin public key"
          value={pubkeyNewAdminInput}
          onChange={onPubkeyNewAdminInputChange}
          className="input input-bordered input-primary w-full max-w-xs mb-4 sm:mb-0 sm:mr-4"
        />
        <button
          className={`btn ${styles.btnOwnership} font-semibold`}
          onClick={handleTransferOwnership}
        >
          Transfer Ownership
        </button>
      </div>
      <div className="flex flex-wrap justify-start">
        {campaigns.map((c) => (
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

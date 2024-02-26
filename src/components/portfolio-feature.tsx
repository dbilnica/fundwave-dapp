import { useRouter } from "next/router";
import Head from "next/head";
import { FC, useEffect, useState, useCallback } from "react";
import idl from "@/components/idl/crowdfunding_dapp.json";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { BN, Program, AnchorProvider, web3 } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { toast, ToastContainer } from "react-toastify";
import { lamportsToSol } from "@/utils/lamportsToSol";
import { shortenAddress } from "@/utils/shortenAddress";
import Image from "next/image";
import "react-toastify/dist/ReactToastify.css";
import DonorsList from "utils/DonorsList";
import styles from "@/styles/Portfolio.module.css";

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.metadata.address);

interface CampaignsTableProps {
  program: Program;
  walletKey: PublicKey;
}

export const PortfolioDetail: FC<CampaignsTableProps> = ({ program }) => {
  const [campaign, setCampaign] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const ourWallet = useWallet();
  const { connection } = useConnection();
  const [userPublicKey, setUserPublicKey] = useState(null);
  const [walletConnected, setWalletConnected] = useState<boolean | null>(null);
  const [campaignPublicKey, setCampaignPublicKey] = useState(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showImage, setShowImage] = useState(false);
  const [showDonors, setShowDonors] = useState(false);
  const [isWithdrawEnabled, setIsWithdrawEnabled] = useState(false);
  const ipfsProviders = [
    "https://dweb.link/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
  ];
  const explorerBaseUrl = "https://explorer.solana.com";
  const networkParam = "?cluster=devnet";

  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);

  const toggleDonorsVisibility = () => {
    setShowDonors(!showDonors);
  };

  const getCampaign = useCallback(async () => {
    setIsLoading(true);
    try {
      const campaigns = await program.account.campaign.all();
      const userOwnedCampaign = campaigns.find(
        ({ account }) =>
          account.owner.toBase58() === ourWallet.publicKey?.toBase58()
      );

      if (userOwnedCampaign) {
        setCampaign(userOwnedCampaign.account);
        setCampaignPublicKey(userOwnedCampaign.publicKey);
      } else {
        console.error("No campaign found for the current user.");
        setCampaign(null);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setIsLoading(false);
    }
  }, [program, ourWallet.publicKey]);

  const computeImageUrl = () => {
    const baseUri = ipfsProviders[currentGatewayIndex % ipfsProviders.length];
    console.log();
    return `${baseUri}${campaign.imageIpfsHash}`;
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

  const Loader = () => (
    <div className={`${styles.loader} flex justify-center items-center`}>
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  );

  const getProvider = async (): Promise<AnchorProvider> => {
    const provider = new AnchorProvider(
      connection,
      ourWallet,
      AnchorProvider.defaultOptions()
    );
    return provider;
  };

  useEffect(() => {
    const isConnected = ourWallet.connected;
    setWalletConnected(isConnected);
    if (isConnected && ourWallet.publicKey) {
      const signerPubkey = ourWallet.publicKey;
      setUserPublicKey(signerPubkey);
    } else {
      setUserPublicKey(null);
      console.log("Wallet is not connected.");
    }
  }, [ourWallet.connected, ourWallet.publicKey]);

  useEffect(() => {
    if (userPublicKey && program) {
      getCampaign();
    }
  }, [userPublicKey, program, getCampaign]);

  useEffect(() => {
    if (campaign) {
      const isPledgedEnough = campaign.pledged / campaign.goal >= 0.8;
      const canWithdraw = isPledgedEnough && !campaign.isWithdrawn;
      setIsWithdrawEnabled(canWithdraw);
    }
  }, [campaign]);

  if (walletConnected === null) {
    return null;
  }

  const withdrawCampaign = async (publicKey) => {
    setIsWithdrawing(true);
    try {
      const anchProvider = await getProvider();
      const program = new Program(idl_object, programID, anchProvider);

      await program.methods
        .campaignWithdraw()
        .accounts({
          campaign: publicKey,
          user: anchProvider.wallet.publicKey,
        })
        .rpc();
      toast.success("Campaign has been successfully withdrawn: " + publicKey);
      console.log("Campaign has been successfully withdrawn " + publicKey);
      setTimeout(getCampaign, 2000);
    } catch (error) {
      toast.error("Error while withdrawing", error);
      console.log("Error while withdrawing", error);
    }
    setIsWithdrawing(false);
  };

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

    useEffect(() => {
      if (campaign) {
        const timeoutId = setTimeout(() => {
          setShowImage(true);
        }, 500);
        return () => clearTimeout(timeoutId);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campaign]);

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

  const ProgressBar: FC<{ goal: number; pledged: number }> = ({
    goal,
    pledged,
  }) => {
    const progressPercent = Math.min(100, (pledged / goal) * 100);

    return (
      <div
        style={{
          width: "100%",
          backgroundColor: "#e0e0e0",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            height: "10px",
            width: `${progressPercent}%`,
            background: "linear-gradient(to bottom right, #667eea, #764ba2)",
            borderRadius: "8px",
          }}
        ></div>
      </div>
    );
  };

  if (!campaign) {
    return <Loader />;
  }

  const progressPercent = (
    (Number(campaign.pledged) / Number(campaign.goal)) *
    100
  ).toFixed(1);
  const endTime = new Date(campaign.endCampaign.toNumber() * 1000).getTime();

  return (
    <>
      <Head>
        <title>{campaign.name} | FundWave Campaign</title>
        <meta
          name="description"
          content={`${campaign.name}: ${campaign.description}`}
        />
      </Head>
      <ToastContainer position="bottom-center" />
      <div
        className={`flex justify-center mt-0 mb-10 ${styles.mobileMarginAdjustment}`}
      >
        <div className="card w-full max-w-3xl bg-base-100 shadow-xl">
          <figure className="px-10 pt-10">
            <Image
              className={styles.campaignImage}
              style={{ borderRadius: "1.1rem" }}
              src={computeImageUrl()}
              alt="Campaign Image"
              width={750}
              height={450}
              onLoad={() => {
                setImageLoading(false);
              }}
              onError={() => {
                console.error("Image failed to load");
                handleImageError();
              }}
            />
          </figure>
          <div className="card-body">
            <div className="flex flex-col items-start text-left">
              <h2 className={`${styles.cardTitle} text-4xl font-bold`}>
                {campaign.name}
              </h2>
              <p className="mt-2 mb-4">{campaign.description}</p>
            </div>

            <div
              className={`${styles.ownerAddress} flex justify-between items-center`}
            >
              <div>
                <span>Campaign Owner: </span>
                <a
                  href={`${explorerBaseUrl}/address/${campaign?.owner?.toString()}${networkParam}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.ownerLink}
                >
                  {shortenAddress(campaign?.owner?.toString() ?? "")}
                </a>
              </div>
              <div>
                <span>Campaign Address:</span>
                <a
                  href={`${explorerBaseUrl}/address/${campaignPublicKey?.toString()}${networkParam}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.ownerLink}
                >
                  {shortenAddress(campaignPublicKey?.toString() ?? "")}
                </a>
              </div>
            </div>
            <div className="mt-auto">
              <div className="mb-4">
                <ProgressBar
                  goal={Number(campaign.goal)}
                  pledged={Number(campaign.pledged)}
                />
              </div>
              <div className="flex justify-between items-center text-center">
                <div className="flex-1">
                  <p className="text-lg font-bold">{progressPercent}%</p>
                  <span className="text-sm">achieved</span>
                </div>
                <div className="flex-1 border-l border-r border-gray-300">
                  <p className="text-lg font-bold">
                    {lamportsToSol(Number(campaign.pledged)).toString()} SOL
                  </p>
                  <span className="text-sm">collected</span>
                </div>
                <div className="flex-1 border-r border-gray-300">
                  <p className="text-lg font-bold">
                    {lamportsToSol(Number(campaign.goal)).toString()} SOL
                  </p>
                  <span className="text-sm">goal</span>
                </div>

                <div className="flex-1">
                  <div className="text-lg font-bold">
                    <Countdown endTime={endTime} />
                  </div>
                  <span className="text-sm">remaining</span>
                </div>
              </div>

              {!showDonors && (
                <div className={styles.buttonContainer}>
                  <button
                    onClick={toggleDonorsVisibility}
                    className={`btn ${styles.btnSupporters} text-xl font-semibold ml-2`}
                  >
                    Show Supporters
                  </button>
                </div>
              )}

              {showDonors && (
                <DonorsList
                  pledgers={campaign?.pledgers}
                  onClose={() => setShowDonors(false)}
                />
              )}
              <div className={styles.buttonContainer}>
                <button
                  onClick={() => withdrawCampaign(campaignPublicKey)}
                  className={`btn btn-wide ${styles.btnWithdraw} text-xl font-bold`}
                  disabled={!isWithdrawEnabled || isWithdrawing}
                >
                  {isWithdrawing ? "Withdrawing..." : "Withdraw Campaign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const ShowPortfolio: FC = () => {
  const ourWallet = useWallet();
  const router = useRouter();
  const { campaignId } = router.query;
  const { connection } = useConnection();
  const [program, setProgram] = useState<Program | null>(null);

  const initializeProgram = useCallback(async () => {
    try {
      const anchProvider = new AnchorProvider(
        connection,
        ourWallet,
        AnchorProvider.defaultOptions()
      );
      const program = new Program(idl_object, programID, anchProvider);
      setProgram(program);
    } catch (error) {
      console.error("Error while initializing program:", error);
    }
  }, [connection, ourWallet]);

  const campaignIdString = Array.isArray(campaignId)
    ? campaignId[0]
    : campaignId;

  useEffect(() => {
    initializeProgram();
  }, [initializeProgram]);

  return (
    <div className={`${styles.campaignsView} p-5`}>
      <PortfolioDetail walletKey={ourWallet.publicKey!} program={program} />
    </div>
  );
};

export default ShowPortfolio;

import { useRouter } from "next/router";
import Head from "next/head";
import { FC, useEffect, useState, useCallback } from "react";
import idl from "@/components/idl/crowdfunding_dapp.json";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { BN, Program, AnchorProvider, web3 } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { toast, ToastContainer } from "react-toastify";
import { solToLamports } from "@/utils/solToLamports";
import { lamportsToSol } from "@/utils/lamportsToSol";
import { shortenAddress } from "@/utils/shortenAddress";
import Image from "next/image";
import "react-toastify/dist/ReactToastify.css";
import DonorsList from "utils/DonorsList";
import styles from "@/styles/CampaignDetail.module.css";

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.metadata.address);

const MIN_SUPPORT_AMOUNT_SOL = 0.01;
const MAX_SUPPORT_AMOUNT_SOL = 43478;

interface CampaignsTableProps {
  program: Program;
  walletKey: PublicKey;
  campaignId: string;
}

export const CampaignDetail: FC<CampaignsTableProps> = ({
  program,
  campaignId,
}) => {
  const [campaign, setCampaign] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const ourWallet = useWallet();
  const { connection } = useConnection();
  const [campaignPublicKey, setCampaignPublicKey] = useState(null);
  const [isSupporting, setIsSupporting] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showImage, setShowImage] = useState(false);
  const [amount, setAmount] = useState("1");
  const [showDonors, setShowDonors] = useState(false);
  const ipfsProviders = [
    "https://dweb.link/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
  ];
  const explorerBaseUrl = "https://explorer.solana.com";
  const networkParam = "?cluster=devnet";

  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
  const userHasDonated = () => {
    return campaign?.pledgers?.some(
      (pledger) =>
        pledger.pledgerPubkey.toString() === ourWallet.publicKey?.toString()
    );
  };

  const toggleDonorsVisibility = () => {
    setShowDonors(!showDonors);
  };

  const inputBgColor = `rgb(45, 46, 49)`;

  const getCampaign = useCallback(async () => {
    if (!campaignId) {
      console.error("Campaign ID is undefined");
      setIsLoading(false);
      return;
    }
    try {
      const campaignKey = new PublicKey(campaignId);
      const campaignData = await program.account.campaign.fetch(campaignKey);
      setCampaign(campaignData);
      setCampaignPublicKey(campaignKey);
    } catch (error) {
      console.error("Error fetching campaign:", error);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, program]);

  const computeImageUrl = () => {
    const baseUri = ipfsProviders[currentGatewayIndex % ipfsProviders.length];
    console.log();
    return `${baseUri}${campaign.imageIpfsHash}`;
  };

  const handleAmountChange = (e) => {
    let value = e.target.value;
    const regex = /^\d*\.?\d{0,2}$/;
    if (value === "" || regex.test(value)) {
      let numericValue = parseFloat(value);
      if (isNaN(numericValue)) {
        setAmount("");
      } else if (numericValue < MIN_SUPPORT_AMOUNT_SOL) {
        setAmount(MIN_SUPPORT_AMOUNT_SOL.toString());
      } else {
        setAmount(value);
      }
    }
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

  const supportCampaign = async (amount) => {
    const amountLamports = solToLamports(amount);
    if (
      isNaN(amount) ||
      amount < MIN_SUPPORT_AMOUNT_SOL ||
      amount > MAX_SUPPORT_AMOUNT_SOL
    ) {
      toast.error(
        `Support amount must be between ${MIN_SUPPORT_AMOUNT_SOL} and ${MAX_SUPPORT_AMOUNT_SOL} SOL.`
      );
      return;
    }
    setIsSupporting(true);
    try {
      const anchProvider = await getProvider();
      const program = new Program(idl_object, programID, anchProvider);

      await program.methods
        .campaignSupport(new BN(amountLamports))
        .accounts({
          campaign: campaignPublicKey,
          user: anchProvider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      toast.success(
        `Campaign "${campaign.name}" has been successfully supported!`
      );
      console.log(
        "Campaign has been successfully supported " + campaignPublicKey
      );
      setAmount("");
      setTimeout(getCampaign, 2000);
    } catch (error) {
      toast.error("Error while supporting!", error);
      console.log("Error while supporting", error);
    }
    setIsSupporting(false);
  };

  const cancelSupport = async (publicKey) => {
    try {
      const anchProvider = await getProvider();
      const program = new Program(idl_object, programID, anchProvider);

      await program.methods
        .supportCancel()
        .accounts({
          campaign: publicKey,
          user: anchProvider.wallet.publicKey,
        })
        .rpc();
      toast.success("Your support has been successfully canceled.");
      console.log("Campaign support has been successfully canceled");
      setTimeout(getCampaign, 2000);
    } catch (error) {
      toast.error(
        "There was an error canceling your support. Please try again."
      );
      console.log("Error while cancelling support", error);
    }
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

  useEffect(() => {
    if (program && campaignId && typeof campaignId === "string") {
      getCampaign();
    }
  }, [campaignId, getCampaign, program]);

  useEffect(() => {
    if (campaign) {
      const timeoutId = setTimeout(() => {
        setShowImage(true);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [campaign]);

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
      <ToastContainer position="top-center" />
      <div
        className={`flex justify-center mt-8 mb-10 ${styles.mobileMarginAdjustment}`}
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
            <h2 className={`${styles.cardTitle} text-4xl font-bold`}>
              {campaign.name}
            </h2>
            <p className="mb-4">{campaign.description}</p>
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
                    className={`btn btn-wide ${styles.btnSupporters} text-xl font-semibold ml-2`}
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

              {userHasDonated() && (
                <div className={styles.buttonContainer}>
                  <button
                    onClick={() => cancelSupport(campaignPublicKey)}
                    className={`btn btn-wide ${styles.btnCancel} text-xl font-semibold ml-2`}
                  >
                    Cancel Support
                  </button>
                </div>
              )}
              <div className={styles.cardActions}>
                <div className={styles.inputButtonContainer}>
                  <input
                    id="support"
                    type="number"
                    value={amount}
                    max={MAX_SUPPORT_AMOUNT_SOL.toString()}
                    step="0.5"
                    onChange={handleAmountChange}
                    style={{ backgroundColor: inputBgColor }}
                    placeholder="Amount in SOL"
                    className={`input input-bordered input-primary ${styles.inputSupport}`}
                    required
                  />
                  <button
                    onClick={() => supportCampaign(parseFloat(amount))}
                    className={`btn ${styles.btnSupport} text-xl font-bold`}
                    disabled={isSupporting || parseFloat(amount) <= 0}
                  >
                    {isSupporting
                      ? "Supporting..."
                      : `Support with ${amount} SOL`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const ShowCampaign: FC = () => {
  const ourWallet = useWallet();
  const router = useRouter();
  const { campaignId } = router.query;
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
      <CampaignDetail
        walletKey={ourWallet.publicKey!}
        program={program}
        campaignId={campaignIdString}
      />
    </div>
  );
};

export default ShowCampaign;

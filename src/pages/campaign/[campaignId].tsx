import { useRouter } from "next/router";
import Head from "next/head";
import { FC, useEffect, useState } from "react";
import idl from "@/components/idl/crowdfunding_dapp.json";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
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
import { toast, ToastContainer } from "react-toastify";
import Image from "next/image";
import "react-toastify/dist/ReactToastify.css";
import DonorsList from "utils/DonorsList";
import styles from './CampaignDetail.module.css';


const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.metadata.address);

interface CampaignsTableProps {
  program: Program;
  walletKey: PublicKey;
  campaignId: string;
}

export const CampaignDetail: FC<CampaignsTableProps> = ({
  program,
  walletKey,
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
  const ipfsProviders = [
    "https://ipfs.io/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
    "https://dweb.link/ipfs/",
  ];
  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);

  const getCampaign = async () => {
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
      console.log(campaignData);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  };

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

  const supportCampaign = async (amount) => {
    setIsSupporting(true);
    try {
      const anchProvider = await getProvider();
      const program = new Program(idl_object, programID, anchProvider);
      console.log("Test");
      console.log(campaignPublicKey);

      await program.methods
        .campaignSupport(new BN(amount))
        .accounts({
          campaign: campaignPublicKey,
          user: anchProvider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      toast.success(
        `Campaign "${campaign.name}" has been successfully reviewed!`
      );
      console.log(
        "Campaign has been successfully supported " + campaignPublicKey
      );
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
      console.log("Campaign support been successfully canceled");
      setTimeout(getCampaign, 2000);
    } catch (error) {
      console.log("Error while cancelling support");
    }
  };

  const withdrawCampaign = async (publicKey) => {
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
      console.log("Campaign has been successfully withdrawed " + publicKey);
    } catch (error) {
      console.log("Error while withdrawing");
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
    if (campaignId && typeof campaignId === "string") {
      getCampaign();
    }
  }, [campaignId, walletKey, program]);

  useEffect(() => {
    if (campaign) {
      // Check if campaign is not null
      const timeoutId = setTimeout(() => {
        setShowImage(true);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [campaign?.imageIpfsHash]); // Use optional chaining to safely access imageIpfsHash

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
      <div className="flex justify-center mt-10 mb-10">
        <div className="card w-full max-w-4xl bg-base-100 shadow-xl">
          <figure className="px-10 pt-10">
            <Image
              className={styles.campaignImage}
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
          </figure>
          <div className="card-body">
          <h2 className={`${styles.cardTitle} text-4xl font-bold`}>{campaign.name}</h2>
            <p className="mb-4">{campaign.description}</p>

            <ProgressBar
              goal={Number(campaign.goal)}
              pledged={Number(campaign.pledged)}
            />
            <div className="flex justify-between items-center my-4">
              <div>
                <p className="text-lg font-bold">{progressPercent}% achieved</p>
                <p className="text-lg">
                  {campaign.pledged?.toString()} SOL collected
                </p>
              </div>
              <div>
                <Countdown endTime={endTime} />
              </div>
            </div>
            {campaign && <DonorsList pledgers={campaign.pledgers} />}

            <div className="card-actions justify-end">
              <button
                onClick={() => supportCampaign(100)}
                className={`${styles.btn} btn btn-primary`}
                disabled={isSupporting}
              >
                {isSupporting ? "Supporting..." : "Support with 100 SOL"}
              </button>
              <button
                onClick={() => cancelSupport(campaignPublicKey)}
                className="btn btn-error"
              >
                Cancel Support
              </button>
              <button
                onClick={() => withdrawCampaign(campaignPublicKey)}
                className="btn btn-warning"
              >
                Withdraw Campaign
              </button>
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

  const initializeProgram = async () => {
    try {
      const anchProvider = await getProvider();
      const program = new Program(idl_object, programID, anchProvider);
      setProgram(program);
    } catch (error) {
      console.error("Error while program initialization");
    }
  };

  const campaignIdString = Array.isArray(campaignId)
    ? campaignId[0]
    : campaignId;

  useEffect(() => {
    initializeProgram();
  }, [ourWallet, connection]);

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

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
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


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
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error("Error while fetching the campaign details:", error);
    }
  };

  const Loader = () => (
    <div className="flex justify-center items-center">
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
      toast.success(`Campaign "${campaign.name}" has been successfully reviewed!`);
      console.log(
        "Campaign has been successfully supported " + campaignPublicKey
      );
      setTimeout(getCampaign, 2000);
    } catch (error) {
      toast.error("Error while supporting!", error);
      console.log("Error while supporting", error);
    }
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
    <ToastContainer position='top-center' />
    <div className="shadow-md rounded-lg overflow-hidden my-4">
          <div className="p-4">
              <h1 className="font-bold text-xl mb-2">{campaign.name}</h1>
              <p className="text-grey-darker text-base mb-4">
                  {campaign.description}
              </p>
              <p className="text-grey-darker text-base">
                  Goal: {campaign.goal?.toString()} SOL
              </p>
              <p className="text-grey-darker text-base">
                  Pledged: {campaign.pledged?.toString()} SOL
              </p>

              <ProgressBar
                  goal={Number(campaign.goal)}
                  pledged={Number(campaign.pledged)} />
          </div>
          <div className="p-4 border-t border-grey-light">
              <Countdown endTime={endTime} />
              <div className="text-sm">remaining</div>
          </div>
          <div className="px-4 pt-3 pb-4 border-t border-grey-light">
              <div className="text-xs uppercase font-bold text-grey-dark tracking-wide">
                  Support This Campaign
              </div>
              <div className="flex mt-2">
                  <button
                      onClick={() => supportCampaign(100)}
                      className="bg-blue-500 hover:bg-blue-dark text-white font-bold py-2 px-4 rounded"
                  >
                      Support with 100 SOL
                  </button>
                  <button
                      onClick={() => cancelSupport(campaignPublicKey)}
                      className="bg-red-500 hover:bg-red-dark text-white font-bold py-2 px-4 rounded ml-2"
                  >
                      Cancel Support
                  </button>
                  <button
                      onClick={() => withdrawCampaign(campaignPublicKey)}
                      className="bg-purple-500 hover:bg-red-dark text-white font-bold py-2 px-4 rounded ml-2"
                  >
                      Withdraw Campaign
                  </button>
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

  /*if (typeof campaignIdString !== 'string') {
        return <Loader/>
    }*/

  return (
    <div className="campaigns-view p-5">
      <CampaignDetail
        walletKey={ourWallet.publicKey!}
        program={program}
        campaignId={campaignIdString}
      />
    </div>
  );
};

export default ShowCampaign;

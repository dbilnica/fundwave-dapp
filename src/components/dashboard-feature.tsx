import { useEffect, useState, FC, useMemo, useCallback } from "react";
import {
  Program,
  ProgramAccount,
  AnchorProvider,
} from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "@/components/idl/crowdfunding_dapp.json";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import Image from "next/image";
import { SearchIcon } from "@heroicons/react/outline";
import SearchAndToggleCard from "@/utils/SearchAndToggleCard";

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.metadata.address);

interface CampaignsTableProps {
  program: Program;
  walletKey: PublicKey;
}

export const CampaignsTable: FC<CampaignsTableProps> = ({
  program
}) => {
  const [campaigns, setCampaigns] = useState<ProgramAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEndedCampaigns, setShowEndedCampaigns] = useState(false);
  const [isToggled, setIsToggled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

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

  const getAllCampaigns = useCallback(async () => {
    if (program && program.account && program.account.campaign) {
      try {
        const fetchedCampaigns = await program.account.campaign.all();
        const currentTime = new Date().getTime();
        const validAndFilteredCampaigns = fetchedCampaigns.filter(campaign => 
          campaign.account !== null &&
          (showEndedCampaigns
            ? new Date(campaign.account.endCampaign.toNumber() * 1000).getTime() <= currentTime
            : new Date(campaign.account.endCampaign.toNumber() * 1000).getTime() > currentTime) &&
          campaign.account.isActive
        );
  
        validAndFilteredCampaigns.sort((a, b) => {
          return (
            a.account.endCampaign.toNumber() - b.account.endCampaign.toNumber()
          );
        });
  
        setCampaigns(validAndFilteredCampaigns);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching campaigns:", error);
        setIsLoading(true);
      }
    } else {
      console.log('Program not initialized');
    }
  }, [program, showEndedCampaigns]);

  const toggleCampaignsView = () => {
    setShowEndedCampaigns(!showEndedCampaigns);
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

  const filteredCampaigns = useMemo(() => {
    if (!searchQuery) return campaigns;
    const lowerCaseSearchQuery = searchQuery.toLowerCase();
    return campaigns.filter(
      (campaign) =>
        campaign.account.name.toLowerCase().includes(lowerCaseSearchQuery) ||
        campaign.account.description
          .toLowerCase()
          .includes(lowerCaseSearchQuery)
    );
  }, [campaigns, searchQuery]);

  useEffect(() => {
    getAllCampaigns();
  }, [getAllCampaigns]);
  

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
    const progressPercent = (
      (Number(campaign.account.pledged) / Number(campaign.account.goal)) *
      100
    ).toFixed(1);
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
      <div className="card w-96 bg-base-100 shadow-xl m-2">
        <figure className="px-10 pt-10 relative">
          {imageLoading && <Loader />}
          {showImage && (
            <div className="overflow-hidden" style={{ borderRadius: "0.5rem" }}>
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
        <div className="card-body flex flex-col">
          <h2
            className="line-clamp-2 card-title text-left text-2xl font-bold mb-1"
            style={{ textTransform: "uppercase" }}
          >
            {campaign.account.name}
          </h2>
          <p className="line-clamp-3 text-left text-lg mb-4 flex-grow">
            {campaign.account.description}
          </p>
          <div className="mt-auto">
            <div className="mb-4">
              <ProgressBar
                goal={Number(campaign.account.goal)}
                pledged={Number(campaign.account.pledged)}
              />
            </div>
            <div className="flex justify-between items-center text-cente">
              <div className="flex-1">
                <p className="text-lg font-bold">{progressPercent}%</p>
                <span className="text-sm">achieved</span>
              </div>
              <div className="flex-1 border-l border-r border-gray-300">
                <p className="text-lg font-bold">
                  {campaign.account.pledged.toString()} SOL
                </p>
                <span className="text-sm">collected</span>
              </div>
              <div className="flex-1">
                <Countdown endTime={endTime} />
                <span className="text-sm">remaining</span>
              </div>
            </div>
            <div className="card-actions justify-center">
              <Link href={`/campaign/${campaignId}`} passHref>
                <button
                  className="btn btn-wide text-2xl font-bold mt-5"
                  style={{ width: "100%" }}
                >
                  Support campaign
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };
  return (
    <>
      <div>
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
        <SearchAndToggleCard
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          toggleCampaignsView={toggleCampaignsView}
          isToggled={isToggled}
          setIsToggled={setIsToggled}
          onClose={() => setShowSearch(false)}
        />
      )}

        <div className="flex flex-wrap justify-start">
          {filteredCampaigns.map((c) => (
            <CampaignCard key={c.publicKey.toBase58()} campaign={c} />
          ))}
        </div>
      </div>
    </>
  );
};

export const ShowCampaigns: FC = () => {
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
    <div className="campaigns-view">
      <CampaignsTable walletKey={ourWallet.publicKey!} program={program} />
    </div>
  );
};

export default ShowCampaigns;

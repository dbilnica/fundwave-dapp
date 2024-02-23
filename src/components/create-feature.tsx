import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { FC, useState, useRef, ChangeEvent } from "react";
import {
  Program,
  AnchorProvider,
  web3,
  utils,
  BN,
} from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { solToLamports } from "@/utils/solToLamports";
import idl from "@/components/idl/crowdfunding_dapp.json";
import { toast, ToastContainer } from "react-toastify";
import styles from "@/styles/CreateFeature.module.css";
import "react-toastify/dist/ReactToastify.css";

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.metadata.address);

const MIN_NAME_LEN = 3;
const MAX_NAME_LEN = 50;
const MIN_DESC_LEN = 10;
const MAX_DESC_LEN = 500;
const MAX_GOAL_SOL = 43478;
const MAX_DURATION_DAYS = 365;

export const Crowdfunding: FC = () => {
  const ourWallet = useWallet();
  const { connection } = useConnection();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState<number>(1);
  const [duration, setDuration] = useState<number>(1);
  const [file, setFile] = useState("");
  const [cid, setCid] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const inputFile = useRef(null);
  const inputBgColor = `rgb(45, 46, 49)`;

  const clearForm = () => {
    setName("");
    setDescription("");
    setGoal(1);
    setDuration(1);
    setCid("");
    setFile("");
    setImagePreview("");
  };

  const getProvider = async (): Promise<AnchorProvider> => {
    const provider = new AnchorProvider(
      connection,
      ourWallet,
      AnchorProvider.defaultOptions()
    );
    return provider;
  };
  const onNameChange = (e: ChangeEvent<any>) => {
    setName(e.target.value);
  };

  const onDescriptionChange = (e: ChangeEvent<any>) => {
    setDescription(e.target.value);
  };

  const onGoalChange = (e: ChangeEvent<any>) => {
    const value = parseFloat(e.target.value);
    if (isNaN(value)) {
      toast.error("Goal must be a number.");
    } else if (value > MAX_GOAL_SOL) {
      setGoal(MAX_GOAL_SOL);
      toast.error(`Goal must be less than or equal to ${MAX_GOAL_SOL} SOL.`);
    } else {
      setGoal(value);
    }
  };

  const onDurationChange = (e: ChangeEvent<any>) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) {
      toast.error("Duration must be a number.");
    } else if (value > MAX_DURATION_DAYS) {
      setDuration(MAX_DURATION_DAYS);
      toast.error(
        `Duration must be less than or equal to ${MAX_DURATION_DAYS} days.`
      );
    } else {
      setDuration(value);
    }
  };

  const createCampaign = async (ipfsCid) => {
    try {
      if (name.length < MIN_NAME_LEN || name.length > MAX_NAME_LEN) {
        toast.error(
          `Name must be between ${MIN_NAME_LEN} and ${MAX_NAME_LEN} characters.`
        );
        return;
      }
      if (
        description.length < MIN_DESC_LEN ||
        description.length > MAX_DESC_LEN
      ) {
        toast.error(
          `Description must be between ${MIN_DESC_LEN} and ${MAX_DESC_LEN} characters.`
        );
        return;
      }
      const anchProvider = await getProvider();
      const program = new Program(idl_object, programID, anchProvider);

      const [campaign] = await PublicKey.findProgramAddressSync(
        [
          utils.bytes.utf8.encode("crowdfunding"),
          (await anchProvider).wallet.publicKey.toBuffer(),
        ],
        program.programId
      );

      const [admin] = await PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("admin_account")],
        program.programId
      );

      const durationInSeconds = new BN(duration * 86400);
      const goalInLamports = new BN(solToLamports(goal));

      await program.methods
        .campaignCreate(
          name,
          description,
          goalInLamports,
          durationInSeconds,
          ipfsCid
        )
        .accounts({
          campaign,
          user: anchProvider.wallet.publicKey,
          admin,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      clearForm();
      toast.success("Campaign successfully created!");
      console.log("Wow, new campaign was created! " + campaign.toString());
    } catch (error) {
      toast.error("Failed to create campaign.");
      console.log("Error while creating campaign ;( " + error);
    }
  };

  const uploadImageToIPFS = async (fileToUpload) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", fileToUpload, fileToUpload.name);
      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      const ipfsHash = await res.text();
      console.log(ipfsHash);
      return ipfsHash;
    } catch (e) {
      console.error(e);
      toast.error("Trouble uploading file to IPFS.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileButtonClick = (e) => {
    e.preventDefault();
    inputFile.current.click();
  };

  const handleChange = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        toast.error(
          "Invalid file type. Only JPG, JPEG, PNG, and WEBP images are allowed."
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          if (img.width < img.height) {
            toast.error(
              "Please select an image oriented in width (landscape)."
            );
            setFile("");
            setImagePreview(null);
          } else {
            setFile(file);
            const ipfsCid = await uploadImageToIPFS(file);
            if (ipfsCid) {
              setCid(ipfsCid);
              setImagePreview(reader.result);
            } else {
              toast.error("Failed to upload the image. Please try again.");
              setFile("");
              setImagePreview(null);
            }
          }
        };
        img.src = e.target.result.toString();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const defaultCid = "QmPwZffFocJEQdMiVNmeBaVJqfRLez6BX4SpJYY1366p33";
    if (!cid) {
      toast.info("Creating campaign without an uploaded image, using default image instead.");
      await createCampaign(defaultCid);
    } else {
      await createCampaign(cid);
    }
  };

  return (
    <div className="campaigns-create px-5 py-5 max-w-4xl mx-auto">
      <div className="overflow-hidden rounded-lg shadow-lg">
        <ToastContainer position="top-center" />
        <form id="create" onSubmit={handleSubmit} className="bg-base-100 p-6">
          <div className="mb-6">
            <label
              htmlFor="name"
              className="block text-sm font-bold mb-2 uppercase tracking-wider"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Name of the campaign"
              className="input input-bordered input-primary w-full"
              style={{ backgroundColor: inputBgColor }}
              value={name}
              onChange={onNameChange}
              maxLength={MAX_NAME_LEN}
              required
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="description"
              className="block text-sm font-bold mb-2 uppercase tracking-wider"
            >
              Description
            </label>
            <textarea
              id="description"
              placeholder="Description of the campaign"
              className="input input-bordered input-primary w-full"
              style={{ backgroundColor: inputBgColor }}
              value={description}
              onChange={onDescriptionChange}
              maxLength={MAX_DESC_LEN}
              required
            />
          </div>
          <div className="flex justify-between mb-6">
            <div className="flex-1 mr-2">
              <label
                htmlFor="goal"
                className="block text-sm font-bold mb-2 uppercase tracking-wider"
              >
                Goal
              </label>
              <input
                id="goal"
                type="number"
                min="0.000000001"
                max={MAX_GOAL_SOL}
                step="0.000000001"
                placeholder="Goal in SOL"
                className="input input-bordered input-primary w-full"
                style={{ backgroundColor: inputBgColor }}
                value={goal}
                onChange={onGoalChange}
                required
              />
            </div>
            <div className="flex-1 ml-2 flex items-center">
              <div className="flex-1">
                <label
                  htmlFor="duration"
                  className="block text-sm font-bold mb-2 uppercase tracking-wider"
                >
                  Duration
                </label>
                <input
                  id="duration"
                  type="number"
                  min="1"
                  max={MAX_DURATION_DAYS}
                  placeholder="Duration in days"
                  className="input input-bordered input-primary w-full"
                  style={{ backgroundColor: inputBgColor }}
                  value={duration}
                  onChange={onDurationChange}
                  required
                />
              </div>
              <span className="text-sm ml-1">days</span>
            </div>
          </div>
          <div>
            {imagePreview && (
              <div className="image-preview-container mb-4 flex justify-center items-center">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-w-xs h-auto rounded-lg"
                  style={{ maxWidth: "300px", maxHeight: "300px" }}
                />
              </div>
            )}
            <div>
              <input
                type="file"
                id="file"
                ref={inputFile}
                onChange={handleChange}
                style={{ display: "none" }}
                accept=".jpg, .jpeg, .png, .webp"
              
              />

              <button
                disabled={uploading}
                onClick={handleFileButtonClick}
                className={`btn text-xl font-semibold ml-2`}
              >
                {uploading
                  ? "Uploading..."
                  : imagePreview
                  ? "Change Image"
                  : "Upload Image"}
              </button>
            </div>
          </div>
          <div className="flex justify-center mt-6">
            <button
              type="submit"
              className={`btn ${styles.btnCreate} btn-wide text-xl font-semibold ml-2`}
            >
              Create Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

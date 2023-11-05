import type { NextPage } from "next";
import Head from "next/head";
import { AdminView } from "../views";

const Admin: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Solana Scaffold</title>
        <meta
          name="description"
          content="Admin"
        />
      </Head>
      <AdminView />
    </div>
  );
};

export default Admin;

"use client";

import { useQuery } from "@tanstack/react-query";

export default function HomePage() {
  const {
    data: pingStatus,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["unstructuredPing"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_UNSTRUCTURED_URL}/ping`,
      );
      if (!response.ok) {
        throw new Error(`Unexpected response: ${response.status}`);
      }
      return "Unstructured.io is up and running!";
    },
  });

  return (
    <div>
      <h1>Welcome to the Home Page</h1>
      {isLoading ? (
        <p>Pinging...</p>
      ) : error ? (
        <p>Error pinging Unstructured.io: {error.message}</p>
      ) : (
        <p>{pingStatus}</p>
      )}
    </div>
  );
}

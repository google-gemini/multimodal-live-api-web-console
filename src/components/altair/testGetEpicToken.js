// testGetEpicToken.js
import { getEpicToken } from "./getEpicToken.js"; // Adjust path as needed

(async function test() {
  try {
    const token = await getEpicToken();
    console.log("✅ Successfully retrieved token:\n", token);
  } catch (err) {
    console.error("❌ Error retrieving token:", err);
  }
})();

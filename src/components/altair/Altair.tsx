
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";



const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      json_graph: {
        type: SchemaType.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};


const createEpicPatientDeclaration: FunctionDeclaration = {
  name: "create_epic_patient",
  description:
    "Creates a patient in Epic systems EHR",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      givenName: {
        type: SchemaType.STRING,
        description: "Patient's given (first) name",
      },
      familyName: {
        type: SchemaType.STRING,
        description: "Patient's family (last) name",
      },
      telecom: {
        type: SchemaType.STRING,
        description: "Patient's telecom info (e.g. phone number)",
      },
      gender: {
        type: SchemaType.STRING,
        description: "Patient's gender (male, female, other, unknown)",
        enum: ["male", "female", "other", "unknown"],
      },
      birthDate: {
        type: SchemaType.STRING,
        description: "Patient's birth date (YYYY-MM-DD) if needed",
      },
    },
    required: [ "givenName", "familyName", "telecom", "gender"],
  },
};


const searchEpicPatientDeclaration: FunctionDeclaration = {
  name: "search_epic_patient",
  description: "Searches for patients in Epic systems EHR based on demographics.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      givenName: {
        type: SchemaType.STRING,
        description: "Patient's given (first) name",
      },
      familyName: {
        type: SchemaType.STRING,
        description: "Patient's family (last) name",
      },
      birthDate: {
        type: SchemaType.STRING,
        description: "YYYY-MM-DD format birth date",
      },
      gender: {
        type: SchemaType.STRING,
        description: "legal sex or FHIR 'gender' parameter (male, female, other, unknown)",
        enum: ["male", "female", "other", "unknown"],
      },
      telecom: {
        type: SchemaType.STRING,
        description: "Patient's phone number match on",
      },
    },
    required: [],
  },
};

function AltairComponent() {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: 'System Instruction, Patient.Search requests require one of the following minimum data sets by default in order to match and return a patient record: FHIR ID; SSN; ID with or without an ID Type; Given name, family name, and birthdate; or Given name, family name, legal sex, and phone number/email',
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [
          declaration,
          createEpicPatientDeclaration,
          searchEpicPatientDeclaration,
        ] },
      ],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = async (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      
      // Handle Altair graph rendering
      const altairCall = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name,
      );
      if (altairCall) {
        const str = (altairCall.args as any).json_graph;
        setJSONString(str);
      }

      const createPatientCall = toolCall.functionCalls.find(
        (fc) => fc.name === createEpicPatientDeclaration.name
      );
      if (createPatientCall) {
        // Pull dynamic args from the function call
        const {
          givenName,
          familyName,
          telecom,
          gender,
          birthDate,
        } = createPatientCall.args as any;

        // Build the Patient resource from user arguments; 
        // keep identifier = "000-00-0000" or use the passed identifier if you prefer
        const patientBody = {
          resourceType: "Patient",
          identifier: [
            {
              use: "usual",
              system: "urn:oid:2.16.840.1.113883.4.1",
              value: "000-00-0000",
            },
          ],
          active: "true",
          name: [
            {
              use: "usual",
              family: familyName,
              given: [givenName],
            },
          ],
          telecom: [
            {
              system: "phone",
              value: telecom,
              use: "home",
            },
          ],
          gender: gender,
          birthDate: birthDate,
          address: [],
          maritalStatus: { text: "" },
          generalPractitioner: [],
          extension: [],
        };

        // Epic endpoint
        const epicUrl =
          "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Patient";

        try {
        //   // 1) ***** GET THE TOKEN FROM server.js *****
        //   //    (uncomment below lines to use server-based token approach)
          const tokenResponse = await fetch("http://localhost:8080/getToken");
          if (!tokenResponse.ok) {
            throw new Error(`Token fetch error: ${await tokenResponse.text()}`);
          }
          const tokenData = await tokenResponse.json();
          const token = tokenData.access_token;

        // Bearer token
        // const token ="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJ1cm46b2lkOjEuMi44NDAuMTE0MzUwLjEuMTMuMC4xLjcuMy42ODg4ODQuMTAwIiwiY2xpZW50X2lkIjoiZDlmMDdiZTYtMjhjZC00NjlhLWIyYzEtYzY1OTVjYzgxOTAxIiwiZXBpYy5lY2kiOiJ1cm46ZXBpYzpPcGVuLkVwaWMtY3VycmVudCIsImVwaWMubWV0YWRhdGEiOiJJaW94bFVUcUk4RWs3NGY3UkZwcjFSRFFoVjhKNGJzY2JRbjZVQWhRUmZNOTJQYXJYVGZyaW9Ia0lkTXo2R1gyUzVWU1E5NklYYmczR01tLUFnWXBUM1dzMjFVemFjMllBbUZ4cjJpaEFRdzVDQ2N3ZFF4MkYzVUtjdmJjZW1FdCIsImVwaWMudG9rZW50eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzM2NzczNjEwLCJpYXQiOjE3MzY3NzAwMTAsImlzcyI6InVybjpvaWQ6MS4yLjg0MC4xMTQzNTAuMS4xMy4wLjEuNy4zLjY4ODg4NC4xMDAiLCJqdGkiOiI5MWEyODhiMC02MDc5LTRlNzAtOTMwNy0zZTI5NzRmNmRjZTAiLCJuYmYiOjE3MzY3NzAwMTAsInN1YiI6ImV2TnAtS2hZd09PcUFabjFwWjJlbnVBMyJ9.ROL7-dAa6C9mSNK-QkfOQE8i4BbJSS1TokQFiW7oZZ-4Ng6LAaQMERHyxdynCwopaA2k9kiRV8SwTv3izL0MEMighivNPRF-Mo1KiLAz3T2U_qrlsfn6n_zZlnnqlKb1_jSGgMyeaSRApiez_Iq_1IN4JddSxaKQW8i7tx4UgxI2PzCbNSE84nZSmhpY3wVtUEDmssdHZrpwv9FXrganGGSqZipHrPO1XbJNjIjPaD0wDkKkzdt8tRw7Rmrg3y4RZoMLG6gIHc-aarSRgdOXl143fKeYUTsm5A3Chr8WzNcSBpTRbiLxUhLyKLHp8AyO-010ZpF3iLQwfRzdOO8vng";

        const resp = await fetch(epicUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/fhir+json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(patientBody),
        });

        console.log("Epic Patient.Create status code:", resp.status);
        console.log("Epic Patient.Create status text:", resp.statusText);

        resp.headers.forEach((value, name) => {
          console.log(`${name}: ${value}`);
        });

        if (resp.status === 201) {
          console.log("Epic indicates 'Created' – check headers for location!");
        }

        let data = null;
        try {
          data = await resp.json();
        } catch (err) {
          console.warn("No JSON body or parse error:", err);
        }
        console.log("Epic Patient.Create response data:", data);

        // Return data to Gemini
        client.sendToolResponse({
          functionResponses: [
            {
              response: { output: { success: resp.ok, data } },
              id: createPatientCall.id,
            },
          ],
        });
      } catch (error: any) {
        console.error("Epic Patient.Create error:", error.message);
        client.sendToolResponse({
          functionResponses: [
            {
              response: { output: { success: false, error: error.message } },
              id: createPatientCall.id,
            },
          ],
        });
      }
      }

      const searchPatientCall = toolCall.functionCalls.find(
        (fc) => fc.name === searchEpicPatientDeclaration.name
      );
      if (searchPatientCall) {
        const {
          givenName,
          familyName,
          birthDate,
          gender,
          telecom,
        } = searchPatientCall.args as any;
  
        // 2) Build a query string
        // e.g. /Patient?given=...&family=...&birthdate=...&gender=...&telecom=...
        const searchParams = new URLSearchParams();
        if (givenName) searchParams.set("given", givenName);
        if (familyName) searchParams.set("family", familyName);
        if (birthDate) searchParams.set("birthdate", birthDate);
        if (gender) searchParams.set("gender", gender);
        if (telecom) searchParams.set("telecom", telecom);
  
        // The base endpoint for searching
        const epicSearchUrl = `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Patient?${searchParams.toString()}`;
  
        try {
          // 3) Retrieve an OAuth token from server.js (or use hardcoded if needed)
          
          const tokenResponse = await fetch("http://localhost:8080/getToken");
          if (!tokenResponse.ok) {
            throw new Error(`Token fetch error: ${await tokenResponse.text()}`);
          }
          const tokenData = await tokenResponse.json();
          const token = tokenData.access_token;
          
  
          // or HARDCODED token again
          // const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJh...";
  
          // 4) Call Epic’s GET /Patient
          const resp = await fetch(epicSearchUrl, {
            method: "GET",
            headers: {
              "Accept": "application/fhir+json",
              Authorization: `Bearer ${token}`,
            },
          });
  
          console.log("Epic Patient.Search status code:", resp.status);
          console.log("Epic Patient.Search status text:", resp.statusText);
  
          resp.headers.forEach((value, name) => {
            console.log(`${name}: ${value}`);
          });
  
          let data = null;
          try {
            data = await resp.json();
          } catch (err) {
            console.warn("No JSON body or parse error:", err);
          }
          console.log("Epic Patient.Search response data:", data);
  
          // 5) Return data to Gemini or wherever
          client.sendToolResponse({
            functionResponses: [
              {
                response: { output: { success: resp.ok, data } },
                id: searchPatientCall.id,
              },
            ],
          });
        } catch (error: any) {
          console.error("Epic Patient.Search error:", error.message);
          client.sendToolResponse({
            functionResponses: [
              {
                response: { output: { success: false, error: error.message } },
                id: searchPatientCall.id,
              },
            ],
          });
        }
      }
  };

    

    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);


  return (
    <div>
    </div>
  );
}

export const Altair = memo(AltairComponent);

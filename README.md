# Multimodal Live API - Web console

This repository contains a react-based starter app for using the [Multimodal Live API](<[https://ai.google.dev/gemini-api](https://ai.google.dev/api/multimodal-live)>) over a websocket. It provides modules for streaming audio playback, recording user media such as from a microphone, webcam or screen capture as well as a unified log view to aid in development of your application.

[![Multimodal Live API Demo](readme/thumbnail.png)](https://www.youtube.com/watch?v=J_q7JY1XxFE)

Watch the demo of the Multimodal Live API [here](https://www.youtube.com/watch?v=J_q7JY1XxFE).

## Usage

To get started, [create a free Gemini API key](https://aistudio.google.com/apikey) and add it to the `.env` file. Then:

```
$ npm install && npm start
```

We have provided several example applications on other branches of this repository:

- [demos/GenExplainer](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genexplainer)
- [demos/GenWeather](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genweather)
- [demos/GenList](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genlist)

## Example

Below is an example of an entire application that will use Google Search grounding and then render graphs using [vega-embed](https://github.com/vega/vega-embed):

```typescript
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

export const declaration: FunctionDeclaration = {
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

export function Altair() {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      systemInstruction: {
        parts: [
          {
            text: 'You are my helpful assistant. Any time I ask you for a graph call the "render_altair" function I have provided you. Dont ask for additional information just make your best judgement.',
          },
        ],
      },
      tools: [{ googleSearch: {} }, { functionDeclarations: [declaration] }],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
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
  return <div className="vega-embed" ref={embedRef} />;
}
```

## development

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
Project consists of:

- an Event-emitting websocket-client to ease communication between the websocket and the front-end
- communication layer for processing audio in and out
- a boilerplate view for starting to build your apps and view logs

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

_This is an experiment showcasing the Multimodal Live API, not an official Google product. We’ll do our best to support and maintain this experiment but your mileage may vary. We encourage open sourcing projects as a way of learning from each other. Please respect our and other creators' rights, including copyright and trademark rights when present, when sharing these works and creating derivative work. If you want more info on Google's policy, you can find that [here](https://developers.google.com/terms/site-policies)._

## Running the electron app

Copy the .env.template file to .env and add your Gemini API key.

```bash
cp .env.template .env
```

Run the following commands to run the electron app:

```bash
npm install
npm run electron-dev
```

## Building the electron app

_Note: I had to install `xcode` to get this to work, since it required the `unordered_map` cpp header file. The xcode-select cli tool was not enough._

```bash
python3 -m venv .venv && source .venv/bin/activate && python3 -m pip install setuptools
npm run electron-build
```

## Sign and Notarize

0. You need to have an Apple Developer account.

1. You need to install the following certificates:

a. From Apple's [Certificate Authority](https://www.apple.com/certificateauthority/), download the following - Apple Root CA - G2 - Apple Worldwide Developer Relations CA - G2 - Apple Worldwide Developer Relations Certificate Authority - Developer ID Certification Authority
b. A developer ID Application certificate from [here](https://developer.apple.com/account/resources/certificates/add). You need to generate a Certificate Signing Request (CSR) from your mac to generate the certificate.

2. Create an App Specific Password from [here](https://appleid.apple.com/account/manage)

3. Set the following environment variables:

```bash
export APPLE_ID="sahil.marwaha@trilogy.com" # Your Apple email
export APPLE_APP_SPECIFIC_PASSWORD="YOUR_APP_SPECIFIC_PASSWORD"  # Generate this at appleid.apple.com
export APPLE_ID_PASSWORD="YOUR_APP_SPECIFIC_PASSWORD"  # same as above
export APPLE_TEAM_ID="KRY77A2RML" # Your Apple Team ID
```

4. Add the following to your package.json:  
   a. In your mac build

   ```json
   "mac": {
     "hardenedRuntime": true,
     "gatekeeperAssess": false,
     "entitlements": "electron/entitlements.mac.plist",
     "entitlementsInherit": "electron/entitlements.mac.plist",
     "identity": "G-DEV FZ-LLC (KRY77A2RML)",
     "forceCodeSigning": true
   }
   ```

   b. For notarisation,

   ```json
   "afterSign": "electron-builder-notarize"
   ```

   And add this to your dev dependencies:

   ```bash
   npm install electron-builder-notarize --save-dev
   ```

5. Run the following command to build the app, it will sign and notarize the app as well:

```bash
source .venv/bin/activate && npm run electron-build
```

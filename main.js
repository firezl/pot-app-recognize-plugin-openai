async function recognize(base64, lang, options) {
  const { config, utils } = options;
  const { tauriFetch: fetch } = utils;
  let { model = "gpt-4o", apiKey, requestPath, customPrompt } = config;

  // 檢查是否是 Google API
  const isGoogleAPI = requestPath?.includes(
    "generativelanguage.googleapis.com"
  );

  if (isGoogleAPI) {
    // Google Gemini API 格式
    if (!model || model === "gpt-4o") {
      model = "gemini-2.0-flash";
    }

    const headers = {
      "Content-Type": "application/json",
    };

    // 使用正確的 Google API endpoint
    requestPath = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                customPrompt ||
                "Just recognize the text in the image. Do not offer unnecessary explanations.",
            },
            {
              inlineData: {
                mimeType: "image/png",
                data: base64,
              },
            },
          ],
        },
      ],
    };

    // 添加 API key 到 URL
    requestPath += `?key=${apiKey}`;

    let res = await fetch(requestPath, {
      method: "POST",
      url: requestPath,
      headers: headers,
      body: {
        type: "Json",
        payload: body,
      },
      responseType: 1,
    });

    // 處理 Google API 的返回格式
    if (res.ok) {
      let result = res.data;
      // 檢查返回格式並提供詳細錯誤信息
      if (!result) {
        throw `Empty response from Google API`;
      }
      if (!result.candidates) {
        throw `No candidates in response: ${JSON.stringify(result)}`;
      }
      if (!result.candidates[0]) {
        throw `Empty candidates array: ${JSON.stringify(result)}`;
      }
      if (!result.candidates[0].content) {
        throw `No content in candidate: ${JSON.stringify(
          result.candidates[0]
        )}`;
      }
      if (!result.candidates[0].content.parts) {
        throw `No parts in content: ${JSON.stringify(
          result.candidates[0].content
        )}`;
      }
      if (!result.candidates[0].content.parts[0]) {
        throw `Empty parts array: ${JSON.stringify(
          result.candidates[0].content.parts
        )}`;
      }
      if (!result.candidates[0].content.parts[0].text) {
        throw `No text in part: ${JSON.stringify(
          result.candidates[0].content.parts[0]
        )}`;
      }
      return result.candidates[0].content.parts[0].text;
    } else {
      throw `Request failed with status ${res.status}: ${JSON.stringify(
        res.data
      )}`;
    }
  } else {
    // OpenAI API 處理邏輯
    if (!requestPath) {
      requestPath = "https://api.openai.com";
    }
    if (!/https?:\/\/.+/.test(requestPath)) {
      requestPath = `https://${requestPath}`;
    }
    if (requestPath.endsWith("/")) {
      requestPath = requestPath.slice(0, -1);
    }
    if (!requestPath.endsWith("/chat/completions")) {
      requestPath += "/v1/chat/completions";
    }
    if (!customPrompt) {
      customPrompt =
        "Just recognize the text in the image. Do not offer unnecessary explanations.";
    } else {
      customPrompt = customPrompt.replaceAll("$lang", lang);
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    const body = {
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: customPrompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    };

    let res = await fetch(requestPath, {
      method: "POST",
      url: requestPath,
      headers: headers,
      body: {
        type: "Json",
        payload: body,
      },
      responseType: 1,
    });

    if (res.ok) {
      let result = res.data;
      if (!result || !result.choices || !result.choices[0]) {
        throw `Invalid API Response: ${JSON.stringify(result)}`;
      }

      const choice = result.choices[0];
      let content = "";
      if (choice.message && choice.message.content) {
        content = choice.message.content;
      } else if (choice.content) {
        content = choice.content;
      } else {
        content = JSON.stringify(choice);
      }
      return content;
    } else {
      throw `Request failed with status ${res.status}`;
    }
  }
}

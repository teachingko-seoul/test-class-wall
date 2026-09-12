// ===================================================
// Gemini API 호출을 처리하는 Vercel 서버리스 함수 (/api/gemini)
// ===================================================

export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 지원합니다." });
  }

  const { memoText } = req.body || {};

  // 메모 텍스트 검증 (식별자나 개인정보 제외)
  if (!memoText || typeof memoText !== "string") {
    return res.status(400).json({ error: "올바른 메모 텍스트가 필요합니다." });
  }

  // 서버 환경변수에서 Gemini API 키 가져오기
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: "Gemini API 키가 서버 환경변수(GEMINI_API_KEY)에 설정되지 않았습니다." 
    });
  }

  try {
    // 무료 API 플랜용 Gemini 모델 사용 (gemini-2.5-flash 시도 후 필요시 fallback)
    let modelName = "gemini-2.5-flash";
    let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const prompt = `너는 친절하고 따뜻한 초·중등학교 교사야. 학생이 학급 담벼락에 남긴 메모를 읽고, 칭찬과 긍정적인 피드백 또는 용기를 주는 1~2문장의 다정한 코멘트를 남겨줘.\n\n메모 내용: "${memoText}"`;

    let response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    });

    // 404 발생 시 gemini-1.5-flash로 대체 시도
    if (response.status === 404) {
      modelName = "gemini-1.5-flash";
      url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ]
        })
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API 호출 오류:", errorData);
      return res.status(response.status).json({ 
        error: errorData.error?.message || "Gemini API 호출에 실패했습니다." 
      });
    }

    const data = await response.json();
    const comment = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "좋은 글이네요! 응원합니다.";

    return res.status(200).json({ comment });
  } catch (error) {
    console.error("Gemini API 서버 에러:", error);
    return res.status(500).json({ error: "서버 처리 도중 에러가 발생했습니다." });
  }
}

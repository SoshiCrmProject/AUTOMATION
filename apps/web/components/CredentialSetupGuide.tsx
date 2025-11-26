import { useState } from "react";
import { useRouter } from "next/router";
import InlineLanguageSwitcher from "./InlineLanguageSwitcher";

interface Step {
  number: number;
  title: { en: string; ja: string };
  description: { en: string; ja: string };
  details: { en: string[]; ja: string[] };
  link?: { text: { en: string; ja: string }; url: string };
}

interface Props {
  platform: "shopee" | "amazon";
}

const SHOPEE_STEPS: Step[] = [
  {
    number: 1,
    title: { en: "Register on Shopee Open Platform", ja: "Shopee Open Platformに登録" },
    description: { en: "Create your developer account to access the API", ja: "APIにアクセスするための開発者アカウントを作成" },
    details: {
      en: ["Go to https://open.shopee.com/", "Click 'Sign Up' in the top right corner", "Use your Shopee seller account email", "Verify your email address", "Complete the registration form"],
      ja: ["https://open.shopee.com/ にアクセス", "右上の「サインアップ」をクリック", "Shopeeセラーアカウントのメールアドレスを使用", "メールアドレスを確認", "登録フォームを完成"]
    },
    link: { text: { en: "Visit Shopee Open Platform", ja: "Shopee Open Platformにアクセス" }, url: "https://open.shopee.com/" }
  },
  {
    number: 2,
    title: { en: "Create a New App", ja: "新しいアプリを作成" },
    description: { en: "Set up your application to get API credentials", ja: "API認証情報を取得するためにアプリケーションを設定" },
    details: {
      en: ["Log in to Shopee Open Platform", "Go to 'My Apps' section", "Click 'Create App' button", "Enter your app name (e.g., 'AutoShip X Integration')", "Select 'Order Management' permissions", "Submit and wait for approval (usually instant)"],
      ja: ["Shopee Open Platformにログイン", "「マイアプリ」セクションに移動", "「アプリを作成」ボタンをクリック", "アプリ名を入力（例：「AutoShip X Integration」）", "「注文管理」権限を選択", "送信して承認を待つ（通常は即時）"]
    }
  },
  {
    number: 3,
    title: { en: "Get Partner ID & Partner Key", ja: "Partner IDとPartner Keyを取得" },
    description: { en: "Copy these credentials from your app settings", ja: "アプリ設定からこれらの認証情報をコピー" },
    details: {
      en: ["Open your newly created app", "Find 'App Credentials' section", "Copy the Partner ID (numeric, e.g., 1234567)", "Click 'Show' on Partner Key and copy it", "⚠️ Keep Partner Key secret - never share it!", "Store both values securely"],
      ja: ["新しく作成したアプリを開く", "「アプリ認証情報」セクションを見つける", "Partner ID（数字、例：1234567）をコピー", "Partner Keyの「表示」をクリックしてコピー", "⚠️ Partner Keyは秘密に保つ - 決して共有しない！", "両方の値を安全に保存"]
    }
  },
  {
    number: 4,
    title: { en: "Get Shop ID", ja: "Shop IDを取得" },
    description: { en: "Find your shop's unique identifier", ja: "ショップの一意の識別子を見つける" },
    details: {
      en: ["Go to Shopee Seller Center", "Click on 'Settings' or 'Shop Settings'", "Look for 'Shop ID' (usually in URL or shop info)", "Alternative: Use Shopee API test endpoint to get shop list", "Copy the numeric Shop ID (e.g., 987654)", "Each shop has a unique ID"],
      ja: ["Shopeeセラーセンターに移動", "「設定」または「ショップ設定」をクリック", "「Shop ID」を探す（通常はURLまたはショップ情報内）", "代替方法：Shopee APIテストエンドポイントでショップリストを取得", "数値のShop ID（例：987654）をコピー", "各ショップには一意のIDがあります"]
    }
  },
  {
    number: 5,
    title: { en: "OAuth Authorization (Optional)", ja: "OAuth認証（オプション）" },
    description: { en: "Get Access Token for advanced features", ja: "高度な機能のためのアクセストークンを取得" },
    details: {
      en: ["Generate authorization URL with your Partner ID", "Authorize the app in Shopee as the shop owner", "Receive authorization code", "Exchange code for Access Token via API", "Access Token expires - set up refresh flow", "Note: Some features work without Access Token"],
      ja: ["Partner IDで認証URLを生成", "ショップオーナーとしてShopeeでアプリを認証", "認証コードを受信", "API経由でコードをアクセストークンと交換", "アクセストークンは期限切れ - 更新フローを設定", "注：一部の機能はアクセストークンなしで動作"]
    }
  },
  {
    number: 6,
    title: { en: "Enter Credentials in Settings", ja: "設定に認証情報を入力" },
    description: { en: "Save your credentials in AutoShip X", ja: "AutoShip Xに認証情報を保存" },
    details: {
      en: ["Go to Settings page in AutoShip X", "Select 'Shopee' tab", "Enter Partner ID (numeric only)", "Enter Partner Key (copy/paste carefully)", "Enter Shop ID (numeric only)", "Click 'Save Shopee Credentials (Encrypted)'", "Test connection using the 'Test Connection' button"],
      ja: ["AutoShip Xの設定ページに移動", "「Shopee」タブを選択", "Partner ID（数字のみ）を入力", "Partner Key（慎重にコピー/貼り付け）を入力", "Shop ID（数字のみ）を入力", "「Shopee認証情報を保存（暗号化）」をクリック", "「接続をテスト」ボタンを使用して接続をテスト"]
    }
  }
];

const AMAZON_STEPS: Step[] = [
  {
    number: 1,
    title: { en: "Prepare Your Amazon Seller Account", ja: "Amazonセラーアカウントを準備" },
    description: { en: "Ensure your account is active and accessible", ja: "アカウントがアクティブでアクセス可能であることを確認" },
    details: {
      en: ["Have an active Amazon Seller Central account", "Know your login email/phone number", "Know your account password", "Disable 2FA temporarily (or use app-based 2FA)", "Ensure you have a payment method saved", "Add a default shipping address"],
      ja: ["アクティブなAmazonセラーセントラルアカウントを持つ", "ログインメール/電話番号を知っている", "アカウントパスワードを知っている", "2FAを一時的に無効にする（またはアプリベースの2FAを使用）", "支払い方法が保存されていることを確認", "デフォルトの配送先住所を追加"]
    }
  },
  {
    number: 2,
    title: { en: "Set Up Default Shipping Address", ja: "デフォルトの配送先住所を設定" },
    description: { en: "Configure where orders will be shipped", ja: "注文の配送先を設定" },
    details: {
      en: ["Log in to Amazon Seller Central or Amazon.com", "Go to 'Your Addresses'", "Add or select your dropship warehouse address", "Make it the default shipping address", "Verify the address is complete and correct", "Save changes"],
      ja: ["AmazonセラーセントラルまたはAmazon.comにログイン", "「お届け先住所」に移動", "ドロップシップ倉庫の住所を追加または選択", "デフォルトの配送先住所にする", "住所が完全で正確であることを確認", "変更を保存"]
    }
  },
  {
    number: 3,
    title: { en: "Save Payment Method", ja: "支払い方法を保存" },
    description: { en: "Ensure automatic checkout works smoothly", ja: "自動チェックアウトがスムーズに機能することを確認" },
    details: {
      en: ["Go to 'Payment Options' in Amazon", "Add a valid credit/debit card", "Or link your bank account", "Make it the default payment method", "Verify the payment method is active", "Ensure sufficient credit/balance"],
      ja: ["Amazonの「お支払い方法」に移動", "有効なクレジット/デビットカードを追加", "または銀行口座をリンク", "デフォルトの支払い方法にする", "支払い方法がアクティブであることを確認", "十分な与信/残高があることを確認"]
    }
  },
  {
    number: 4,
    title: { en: "Enter Credentials in AutoShip X", ja: "AutoShip Xに認証情報を入力" },
    description: { en: "Securely store your Amazon login", ja: "Amazonログインを安全に保存" },
    details: {
      en: ["Go to Settings page in AutoShip X", "Select 'Amazon' tab", "Enter your Amazon email or phone number", "Enter your Amazon password", "⚠️ Credentials are encrypted with AES-256-GCM", "We NEVER share credentials with third parties", "Click 'Save Amazon Credentials'"],
      ja: ["AutoShip Xの設定ページに移動", "「Amazon」タブを選択", "Amazonのメールまたは電話番号を入力", "Amazonのパスワードを入力", "⚠️ 認証情報はAES-256-GCMで暗号化されます", "第三者と認証情報を共有することは決してありません", "「Amazon認証情報を保存」をクリック"]
    }
  },
  {
    number: 5,
    title: { en: "How Automation Works", ja: "自動化の仕組み" },
    description: { en: "Understanding the Playwright automation", ja: "Playwright自動化を理解する" },
    details: {
      en: ["We use Playwright (headless browser)", "System logs in with your credentials", "Searches for the mapped Amazon product", "Adds item to cart automatically", "Proceeds to checkout", "Completes purchase with saved payment/address", "No Amazon API used - pure browser automation"],
      ja: ["Playwright（ヘッドレスブラウザ）を使用", "システムが認証情報でログイン", "マッピングされたAmazon商品を検索", "自動的にカートに追加", "チェックアウトに進む", "保存された支払い/住所で購入を完了", "Amazon APIは使用しません - 純粋なブラウザ自動化"]
    }
  },
  {
    number: 6,
    title: { en: "Security & Best Practices", ja: "セキュリティとベストプラクティス" },
    description: { en: "Keep your account safe", ja: "アカウントを安全に保つ" },
    details: {
      en: ["Enable app-based 2FA (Google Authenticator)", "Monitor Amazon purchase notifications", "Check Dashboard and Orders page regularly", "Use dry-run mode to test before going live", "Set profit thresholds to avoid losses", "Review manual review queue daily", "Report any suspicious activity immediately"],
      ja: ["アプリベースの2FAを有効にする（Google Authenticator）", "Amazonの購入通知を監視", "ダッシュボードと注文ページを定期的に確認", "本番運用前にドライランモードでテスト", "損失を避けるために利益しきい値を設定", "手動レビューキューを毎日確認", "不審なアクティビティを即座に報告"]
    }
  }
];

export default function CredentialSetupGuide({ platform }: Props) {
  const router = useRouter();
  const locale = (router.locale || "en") as "en" | "ja";
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const steps = platform === "shopee" ? SHOPEE_STEPS : AMAZON_STEPS;

  const t = (key: { en: string; ja: string }) => key[locale];

  return (
    <>
      <button
        onClick={() => setShowGuide(true)}
        style={{
          marginTop: 12,
          width: "100%",
          padding: "12px 16px",
          background: "var(--color-info-bg)",
          color: "var(--color-info)",
          border: "2px solid var(--color-info)",
          borderRadius: "var(--radius-md)",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8
        }}
      >
        📖 {locale === "ja" 
          ? `${platform === "shopee" ? "Shopee" : "Amazon"}認証情報の取得方法（ステップバイステップガイド）`
          : `How to Get ${platform === "shopee" ? "Shopee" : "Amazon"} Credentials (Step-by-Step Guide)`}
      </button>

      {showGuide && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(8px)",
              zIndex: 9998,
              animation: "fadeIn 0.3s ease"
            }}
            onClick={() => setShowGuide(false)}
          />

          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "white",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-xl)",
              maxWidth: 800,
              width: "90%",
              maxHeight: "90vh",
              overflow: "hidden",
              zIndex: 9999,
              animation: "slideUp 0.3s ease",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div style={{
              padding: 24,
              borderBottom: "2px solid var(--color-border)",
              background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
              color: "white"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
                    {platform === "shopee" ? "🛍️ Shopee" : "📦 Amazon"} {locale === "ja" ? "認証情報設定ガイド" : "Credential Setup Guide"}
                  </h2>
                  <p style={{ margin: "8px 0 0 0", fontSize: 14, opacity: 0.9 }}>
                    {locale === "ja" 
                      ? `これらの${steps.length}つの簡単なステップに従って認証情報を取得してください`
                      : `Follow these ${steps.length} simple steps to get your credentials`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <InlineLanguageSwitcher />
                  <button
                    onClick={() => setShowGuide(false)}
                    style={{
                      background: "rgba(255, 255, 255, 0.2)",
                      border: "2px solid white",
                      borderRadius: "var(--radius-full)",
                      width: 40,
                      height: 40,
                      fontSize: 24,
                      cursor: "pointer",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              {steps.map((step) => {
                const isExpanded = expandedStep === step.number;
                return (
                  <div
                    key={step.number}
                    style={{
                      marginBottom: 16,
                      border: "2px solid var(--color-border)",
                      borderRadius: "var(--radius-lg)",
                      overflow: "hidden",
                      transition: "all 0.3s ease"
                    }}
                  >
                    <div
                      onClick={() => setExpandedStep(isExpanded ? null : step.number)}
                      style={{
                        padding: 16,
                        background: isExpanded ? "var(--color-primary)" : "var(--color-elevated)",
                        color: isExpanded ? "white" : "var(--color-text)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--radius-full)",
                        background: isExpanded ? "white" : "var(--color-primary)",
                        color: isExpanded ? "var(--color-primary)" : "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        {step.number}
                      </div>

                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                          {t(step.title)}
                        </h3>
                        <p style={{ margin: "4px 0 0 0", fontSize: 13, opacity: isExpanded ? 0.9 : 0.6 }}>
                          {t(step.description)}
                        </p>
                      </div>

                      <div style={{
                        fontSize: 20,
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.3s ease"
                      }}>
                        ▼
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: 20, background: "white", animation: "fadeIn 0.3s ease" }}>
                        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2, fontSize: 14 }}>
                          {step.details[locale].map((detail, idx) => (
                            <li key={idx} style={{
                              marginBottom: 8,
                              color: detail.startsWith("⚠️") ? "var(--color-warning)" : "var(--color-text)"
                            }}>
                              {detail}
                            </li>
                          ))}
                        </ol>

                        {step.link && (
                          <div style={{ marginTop: 16 }}>
                            <a
                              href={step.link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "10px 16px",
                                background: "var(--color-primary)",
                                color: "white",
                                borderRadius: "var(--radius-md)",
                                fontSize: 13,
                                fontWeight: 600,
                                textDecoration: "none",
                                transition: "all 0.2s ease"
                              }}
                            >
                              �� {t(step.link.text)} →
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{
              padding: 20,
              borderTop: "2px solid var(--color-border)",
              background: "var(--color-elevated)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap"
            }}>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                💡 <strong>{locale === "ja" ? "ヘルプが必要ですか？" : "Need help?"}</strong> {locale === "ja" ? "チェック " : "Check "}
                <a href="/SHOPEE_CREDENTIALS_GUIDE.md" target="_blank" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                  {locale === "ja" ? "ドキュメント" : "documentation"}
                </a>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="btn btn-ghost"
                style={{ minWidth: 120 }}
              >
                {locale === "ja" ? "ガイドを閉じる" : "Close Guide"}
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  );
}

import {
  Download,
  FileImage,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { type Template } from "@/lib/catalog";

type PreviewDialogProps = {
  template: Template | null;
  onOpenChange: (open: boolean) => void;
  onDownload?: (
    template: Template,
    format: "pdf" | "pptx",
  ) => void;
};

/*
 * ============================================================
 * SMART POINT V3
 * ============================================================
 *
 * Le preview ne passe PLUS par :
 *
 *   preview-pdf
 *   ↓
 *   PDF
 *   ↓
 *   iframe
 *   ↓
 *   viewer navigateur / Google
 *
 * Le preview utilise directement :
 *
 *   Supabase Storage
 *   ↓
 *   bucket "preview"
 *   ↓
 *   template.preview_url
 *   ↓
 *   WEBP
 *   ↓
 *   <img>
 *
 * Cela permet d'avoir le même preview sur :
 *
 *   - ordinateur
 *   - tablette
 *   - Android
 *   - iPhone
 *
 * sans dépendre du viewer PDF du navigateur.
 * ============================================================
 */

export function PreviewDialog({
  template,
  onOpenChange,
  onDownload,
}: PreviewDialogProps) {
  /*
   * ==========================================================
   * PREVIEW STATES
   * ==========================================================
   */

  const [previewLoading, setPreviewLoading] =
    useState(false);

  const [previewError, setPreviewError] =
    useState<string | null>(null);

  /*
   * Permet de forcer le rechargement du WEBP
   * lorsqu'on appuie sur "Réessayer".
   */
  const [retryKey, setRetryKey] = useState(0);

  /*
   * ==========================================================
   * CHARGEMENT / RESET DU PREVIEW
   * ==========================================================
   */

  useEffect(() => {
    if (!template) {
      setPreviewLoading(false);
      setPreviewError(null);

      return;
    }

    /*
     * Nouveau template :
     * on réinitialise complètement l'état.
     */
    setPreviewError(null);

    const previewUrl =
      typeof template.preview_url === "string"
        ? template.preview_url.trim()
        : "";

    if (!previewUrl) {
      setPreviewLoading(false);

      setPreviewError(
        "Aucun aperçu WEBP n'est associé à ce template.",
      );

      return;
    }

    /*
     * L'image va maintenant être chargée
     * par le navigateur.
     */
    setPreviewLoading(true);
  }, [template, retryKey]);

  /*
   * ==========================================================
   * FERMETURE DU DIALOGUE
   * ==========================================================
   */

  function handleOpenChange(open: boolean) {
    if (!open) {
      setPreviewLoading(false);

      setPreviewError(null);

      setRetryKey(0);
    }

    onOpenChange(open);
  }

  /*
   * ==========================================================
   * RETRY
   * ==========================================================
   */

  function handleRetry() {
    setPreviewError(null);

    setPreviewLoading(true);

    setRetryKey((value) => value + 1);
  }

  /*
   * ==========================================================
   * AUCUN TEMPLATE
   * ==========================================================
   */

  if (!template) {
    return null;
  }

  /*
   * ==========================================================
   * TEMPLATE INFORMATION
   * ==========================================================
   */

  const templateName =
    template.name ||
    "Template Smart Point";

  const templateCode =
    template.code ??
    template.template_id ??
    "";

  /*
   * ==========================================================
   * PREVIEW URL
   * ==========================================================
   *
   * catalog.ts construit actuellement :
   *
   * /storage/v1/object/public/preview/{template_id}.webp
   *
   * Exemple :
   *
   * 020BC
   *   ↓
   * preview/020BC.webp
   *
   * IMPORTANT :
   * On utilise directement preview_url.
   * On ne reconstruit PAS l'URL à partir du nom.
   */

  const previewUrl =
    typeof template.preview_url === "string"
      ? template.preview_url.trim()
      : "";

  const hasPreview =
    Boolean(previewUrl);

  /*
   * ==========================================================
   * DOWNLOAD AVAILABILITY
   * ==========================================================
   */

  const hasPdf =
    Boolean(
      template.pdf_url &&
        template.pdf_url.trim(),
    );

  const hasPptx =
    Boolean(
      template.pptx_url &&
        template.pptx_url.trim(),
    );

  /*
   * ==========================================================
   * RETRY CACHE BUSTER
   * ==========================================================
   *
   * Cela permet de forcer le navigateur à refaire
   * la requête lorsqu'un utilisateur appuie sur
   * "Réessayer".
   */

  const previewSrc = hasPreview
    ? `${previewUrl}${
        previewUrl.includes("?")
          ? "&"
          : "?"
      }preview_retry=${retryKey}`
    : "";

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <Dialog
      open={Boolean(template)}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        className="
          flex
          h-[94dvh]
          max-h-[94dvh]
          w-[calc(100%-1rem)]
          max-w-7xl
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-border
          bg-background
          p-0

          sm:h-[95vh]
          sm:max-h-[95vh]
          sm:w-[96vw]
        "
      >
        {/* ====================================================
            HEADER
        ===================================================== */}

        <DialogHeader
          className="
            flex
            shrink-0
            flex-row
            items-center
            justify-between
            gap-4
            border-b
            border-border
            px-4
            py-3
            pr-12

            sm:px-5
            sm:py-4
            sm:pr-14
          "
        >
          <div className="min-w-0">
            <DialogTitle
              className="
                truncate
                text-base
                font-semibold

                sm:text-lg
              "
            >
              {templateName}
            </DialogTitle>

            <DialogDescription
              className="
                mt-1
                truncate
                text-xs
                text-muted-foreground
              "
            >
              {templateCode
                ? `Modèle ${templateCode}`
                : "Aperçu du template"}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* ====================================================
            PREVIEW AREA
        ===================================================== */}

        <div
          className="
            relative
            min-h-0
            flex-1
            overflow-auto
            bg-muted/30
          "
        >
          {/* ==================================================
              LOADING
          =================================================== */}

          {previewLoading && (
            <div
              className="
                absolute
                inset-0
                z-20
                flex
                flex-col
                items-center
                justify-center
                gap-4
                bg-background
              "
            >
              <div
                className="
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  bg-primary/10
                "
              >
                <Loader2
                  className="
                    h-8
                    w-8
                    animate-spin
                    text-primary
                  "
                />
              </div>

              <div className="text-center">
                <p
                  className="
                    text-sm
                    font-medium
                  "
                >
                  Chargement de l'aperçu...
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-muted-foreground
                  "
                >
                  Préparation de l'image
                </p>
              </div>
            </div>
          )}

          {/* ==================================================
              PREVIEW ERROR
          =================================================== */}

          {previewError && !previewLoading && (
            <div
              className="
                flex
                min-h-full
                flex-col
                items-center
                justify-center
                gap-5
                px-6
                py-10
                text-center
              "
            >
              <div
                className="
                  flex
                  h-16
                  w-16
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-destructive/10
                  text-destructive
                "
              >
                <FileImage
                  className="
                    h-8
                    w-8
                  "
                />
              </div>

              <div
                className="
                  max-w-lg
                "
              >
                <h3
                  className="
                    text-base
                    font-semibold
                  "
                >
                  Aperçu indisponible
                </h3>

                <p
                  className="
                    mt-2
                    text-sm
                    leading-6
                    text-muted-foreground
                  "
                >
                  {previewError}
                </p>
              </div>

              {/* ----------------------------------------------
                  INFORMATION TECHNIQUE
              ----------------------------------------------- */}

              {previewUrl && (
                <div
                  className="
                    max-w-xl
                    rounded-lg
                    border
                    border-border
                    bg-muted/40
                    px-4
                    py-3
                    text-left
                  "
                >
                  <p
                    className="
                      break-all
                      text-xs
                      leading-5
                      text-muted-foreground
                    "
                  >
                    L'aperçu attendu est :

                    <br />

                    <span
                      className="
                        font-mono
                        text-foreground
                      "
                    >
                      {previewUrl}
                    </span>
                  </p>
                </div>
              )}

              {/* ----------------------------------------------
                  RETRY
              ----------------------------------------------- */}

              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={handleRetry}
              >
                <RefreshCw
                  className="h-4 w-4"
                />

                Réessayer
              </Button>
            </div>
          )}

          {/* ==================================================
              WEBP PREVIEW
          =================================================== */}

          {hasPreview &&
            !previewError && (
              <div
                className="
                  flex
                  min-h-full
                  w-full
                  items-center
                  justify-center
                  p-2

                  sm:p-4
                  md:p-6
                "
              >
                <img
                  key={previewSrc}
                  src={previewSrc}
                  alt={`Aperçu de ${templateName}`}
                  draggable={false}
                  className="
                    block
                    max-h-full
                    max-w-full
                    select-none
                    rounded-lg
                    object-contain
                    shadow-sm
                  "
                  onLoad={() => {
                    setPreviewLoading(false);

                    setPreviewError(null);
                  }}
                  onError={() => {
                    setPreviewLoading(false);

                    setPreviewError(
                      "Le fichier WEBP d'aperçu n'a pas pu être chargé. Vérifie que le fichier existe dans le bucket Supabase « preview » et que son nom correspond exactement au template_id.",
                    );
                  }}
                />
              </div>
            )}
        </div>

        {/* ====================================================
            FOOTER
        ===================================================== */}

        <div
          className="
            flex
            shrink-0
            flex-col
            gap-3
            border-t
            border-border
            bg-background
            px-4
            py-3

            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:px-5
            sm:py-4
          "
        >
          {/* ==================================================
              TEMPLATE INFORMATION
          =================================================== */}

          <div
            className="
              min-w-0
            "
          >
            <p
              className="
                truncate
                text-sm
                font-medium
              "
            >
              {templateName}
            </p>

            <p
              className="
                text-xs
                text-muted-foreground
              "
            >
              Choisissez le format à télécharger
            </p>
          </div>

          {/* ==================================================
              DOWNLOAD BUTTONS
          =================================================== */}

          <div
            className="
              grid
              w-full
              grid-cols-2
              gap-2

              sm:flex
              sm:w-auto
            "
          >
            {/* =================================================
                PDF
            ================================================== */}

            <Button
              type="button"
              variant="outline"
              className="
                w-full
                gap-2

                sm:w-auto
              "
              disabled={
                !hasPdf ||
                !onDownload
              }
              onClick={() =>
                onDownload?.(
                  template,
                  "pdf",
                )
              }
            >
              <Download
                className="
                  h-4
                  w-4
                "
              />

              PDF
            </Button>

            {/* =================================================
                PPTX
            ================================================== */}

            <Button
              type="button"
              className="
                w-full
                gap-2

                sm:w-auto
              "
              disabled={
                !hasPptx ||
                !onDownload
              }
              onClick={() =>
                onDownload?.(
                  template,
                  "pptx",
                )
              }
            >
              <Download
                className="
                  h-4
                  w-4
                "
              />

              PPTX
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
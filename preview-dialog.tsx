import {
  Download,
  FileImage,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
 * NOUVEAU SYSTÈME DE PREVIEW
 *
 * Pour les nouveaux templates :
 *
 *   get-template
 *        ↓
 *   template.preview_parts
 *        ↓
 *   part 01
 *   part 02
 *   part 03
 *   ...
 *        ↓
 *   Supabase Edge Function
 *   preview-file
 *        ↓
 *   Google Drive
 *        ↓
 *   WEBP
 *        ↓
 *   <img>
 *
 * Toutes les parties sont affichées verticalement afin
 * de former un seul aperçu continu.
 *
 * FALLBACK :
 *
 * Si preview_parts n'existe pas, on utilise l'ancien :
 *
 *   template.preview_url
 *
 * ============================================================
 */

const PREVIEW_FILE_FUNCTION_URL =
  "https://eejgfehjeqdwribhgfjm.supabase.co/functions/v1/preview-file";

type PreviewPart = {
  id?: string;
  part_number?: number;
  file_id?: string | null;
  file_name?: string | null;
  storage_path?: string | null;
  page_start?: number | null;
  page_end?: number | null;
};

type TemplateWithPreviewParts = Template & {
  preview_parts?: PreviewPart[] | null;
};

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
   * Nombre d'images déjà chargées.
   */
  const [loadedParts, setLoadedParts] =
    useState(0);

  /*
   * Permet de forcer le rechargement des WEBP.
   */
  const [retryKey, setRetryKey] = useState(0);

  /*
   * ==========================================================
   * TEMPLATE DATA
   * ==========================================================
   */

  const templateWithParts =
    template as TemplateWithPreviewParts | null;

  /*
   * ==========================================================
   * PREVIEW PARTS
   * ==========================================================
   *
   * On trie toujours par part_number pour garantir :
   *
   * 01
   * 02
   * 03
   * ...
   *
   * même si Supabase renvoie les données dans un autre ordre.
   */

  const previewParts = useMemo(() => {
    if (!templateWithParts) {
      return [];
    }

    const parts =
      Array.isArray(
        templateWithParts.preview_parts,
      )
        ? templateWithParts.preview_parts
        : [];

    return parts
      .filter(
        (part) =>
          typeof part?.file_id ===
            "string" &&
          part.file_id.trim().length > 0,
      )
      .sort(
        (a, b) =>
          (a.part_number ?? 0) -
          (b.part_number ?? 0),
      );
  }, [templateWithParts]);

  /*
   * ==========================================================
   * HAS MULTIPART PREVIEW
   * ==========================================================
   */

  const hasMultipartPreview =
    previewParts.length > 0;

  /*
   * ==========================================================
   * OLD PREVIEW FALLBACK
   * ==========================================================
   */

  const previewUrl =
    typeof template?.preview_url ===
    "string"
      ? template.preview_url.trim()
      : "";

  const hasLegacyPreview =
    Boolean(previewUrl);

  /*
   * ==========================================================
   * PREVIEW SOURCE
   * ==========================================================
   *
   * Pour les nouveaux previews :
   *
   * preview-file?file_id=GOOGLE_DRIVE_ID
   */

  const previewImages = useMemo(() => {
    if (!hasMultipartPreview) {
      return [];
    }

    return previewParts.map(
      (part, index) => {
        const fileId =
          part.file_id?.trim() ?? "";

        const separator =
          PREVIEW_FILE_FUNCTION_URL.includes(
            "?",
          )
            ? "&"
            : "?";

        return {
          ...part,
          key:
            part.id ??
            `${fileId}-${part.part_number ?? index + 1}`,
          partNumber:
            part.part_number ??
            index + 1,
          src: `${PREVIEW_FILE_FUNCTION_URL}${separator}file_id=${encodeURIComponent(
            fileId,
          )}&preview_retry=${retryKey}`,
        };
      },
    );
  }, [
    hasMultipartPreview,
    previewParts,
    retryKey,
  ]);

  /*
   * ==========================================================
   * HAS PREVIEW
   * ==========================================================
   */

  const hasPreview =
    hasMultipartPreview ||
    hasLegacyPreview;

  /*
   * ==========================================================
   * TEMPLATE INFORMATION
   * ==========================================================
   */

  const templateName =
    template?.name ||
    "Template Smart Point";

  const templateCode =
    template?.code ??
    template?.template_id ??
    "";

  /*
   * ==========================================================
   * DOWNLOAD AVAILABILITY
   * ==========================================================
   */

  const hasPdf =
    Boolean(
      template?.pdf_url &&
        template.pdf_url.trim(),
    );

  const hasPptx =
    Boolean(
      template?.pptx_url &&
        template.pptx_url.trim(),
    );

  /*
   * ==========================================================
   * CHARGEMENT / RESET DU PREVIEW
   * ==========================================================
   */

  useEffect(() => {
    if (!template) {
      setPreviewLoading(false);
      setPreviewError(null);
      setLoadedParts(0);

      return;
    }

    setPreviewError(null);
    setLoadedParts(0);

    if (!hasPreview) {
      setPreviewLoading(false);

      setPreviewError(
        "Aucun aperçu WEBP n'est associé à ce template.",
      );

      return;
    }

    /*
     * Si multipart :
     * on attend que toutes les images soient chargées.
     *
     * Si ancien preview :
     * une seule image est attendue.
     */

    setPreviewLoading(true);
  }, [
    template,
    hasPreview,
    hasMultipartPreview,
    previewImages.length,
    retryKey,
  ]);

  /*
   * ==========================================================
   * SINGLE LEGACY PREVIEW URL
   * ==========================================================
   */

  const legacyPreviewSrc =
    hasLegacyPreview
      ? `${previewUrl}${
          previewUrl.includes("?")
            ? "&"
            : "?"
        }preview_retry=${retryKey}`
      : "";

  /*
   * ==========================================================
   * IMAGE LOADED
   * ==========================================================
   */

  function handlePartLoad() {
    setLoadedParts(
      (current) => current + 1,
    );
  }

  /*
   * ==========================================================
   * PART ERROR
   * ==========================================================
   */

  function handlePartError(
    partNumber: number,
  ) {
    setPreviewLoading(false);

    setPreviewError(
      `La partie ${String(
        partNumber,
      ).padStart(
        2,
        "0",
      )} de l'aperçu n'a pas pu être chargée.`,
    );
  }

  /*
   * ==========================================================
   * LEGACY IMAGE LOAD
   * ==========================================================
   */

  function handleLegacyLoad() {
    setLoadedParts(1);
    setPreviewLoading(false);
    setPreviewError(null);
  }

  /*
   * ==========================================================
   * ALL PARTS LOADED
   * ==========================================================
   */

  useEffect(() => {
    if (
      hasMultipartPreview &&
      previewImages.length > 0 &&
      loadedParts >=
        previewImages.length
    ) {
      setPreviewLoading(false);
      setPreviewError(null);
    }
  }, [
    hasMultipartPreview,
    previewImages.length,
    loadedParts,
  ]);

  /*
   * ==========================================================
   * FERMETURE DU DIALOGUE
   * ==========================================================
   */

  function handleOpenChange(open: boolean) {
    if (!open) {
      setPreviewLoading(false);
      setPreviewError(null);
      setLoadedParts(0);
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
    setLoadedParts(0);
    setPreviewLoading(true);

    setRetryKey(
      (value) => value + 1,
    );
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
                  {hasMultipartPreview
                    ? `Chargement de ${loadedParts} / ${previewImages.length} partie${
                        previewImages.length >
                        1
                          ? "s"
                          : ""
                      }`
                    : "Préparation de l'image"}
                </p>
              </div>
            </div>
          )}

          {/* ==================================================
              PREVIEW ERROR
          =================================================== */}

          {previewError &&
            !previewLoading && (
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

                {hasMultipartPreview ? (
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
                        text-xs
                        leading-5
                        text-muted-foreground
                      "
                    >
                      Le système de preview utilise{" "}
                      <span className="font-medium text-foreground">
                        {previewParts.length} partie
                        {previewParts.length >
                        1
                          ? "s"
                          : ""}
                      </span>{" "}
                      WEBP depuis Google Drive.
                    </p>
                  </div>
                ) : (
                  previewUrl && (
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
                  )
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
              MULTIPART WEBP PREVIEW
          =================================================== */}

          {hasMultipartPreview &&
            !previewError && (
              <div
                className="
                  flex
                  min-h-full
                  w-full
                  flex-col
                  items-center
                  gap-0
                  px-2
                  py-2

                  sm:px-4
                  sm:py-4

                  md:px-6
                  md:py-6
                "
              >
                {previewImages.map(
                  (
                    part,
                    index,
                  ) => (
                    <img
                      key={`${part.key}-${retryKey}`}
                      src={part.src}
                      alt={`Aperçu ${String(
                        part.partNumber,
                      ).padStart(
                        2,
                        "0",
                      )} de ${templateName}`}
                      draggable={false}
                      loading={
                        index === 0
                          ? "eager"
                          : "lazy"
                      }
                      decoding="async"
                      className="
                        block
                        h-auto
                        w-full
                        max-w-5xl
                        select-none
                        rounded-none
                        object-contain
                        shadow-sm
                      "
                      onLoad={
                        handlePartLoad
                      }
                      onError={() =>
                        handlePartError(
                          part.partNumber,
                        )
                      }
                    />
                  ),
                )}
              </div>
            )}

          {/* ==================================================
              LEGACY SINGLE WEBP PREVIEW
          =================================================== */}

          {!hasMultipartPreview &&
            hasLegacyPreview &&
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
                  key={legacyPreviewSrc}
                  src={legacyPreviewSrc}
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
                  onLoad={
                    handleLegacyLoad
                  }
                  onError={() => {
                    setPreviewLoading(
                      false,
                    );

                    setPreviewError(
                      "Le fichier WEBP d'aperçu n'a pas pu être chargé.",
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
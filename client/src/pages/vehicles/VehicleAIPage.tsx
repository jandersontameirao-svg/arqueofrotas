import { useUser, isGestor } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Upload, ArrowLeft, Loader2, Save, CheckCircle, AlertTriangle, Car } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { LABELS } from "@shared/const";

type ExtractedData = {
  plate: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  yearModel: number | null;
  color: string | null;
  chassi: string | null;
  renavam: string | null;
  vehicleType: string | null;
  fuel: string | null;
  engineCapacity: string | null;
  ownerName: string | null;
  ownerCpfCnpj: string | null;
};

export function VehicleAIPage() {
  const { user } = useUser();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "review" | "saving">("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  // Editable fields for review
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [chassi, setChassi] = useState("");
  const [renavam, setRenavam] = useState("");
  const [vehicleType, setVehicleType] = useState("carro");
  const [observations, setObservations] = useState("");

  const extractMutation = trpc.vehicleAI.extractFromDocument.useMutation({
    onSuccess: (result) => {
      if (result.success && result.data) {
        setExtractedData(result.data);
        // Pre-fill editable fields
        setPlate(result.data.plate || "");
        setBrand(result.data.brand || "");
        setModel(result.data.model || "");
        setYear(result.data.year ? String(result.data.year) : "");
        setColor(result.data.color || "");
        setChassi(result.data.chassi || "");
        setRenavam(result.data.renavam || "");
        setVehicleType(result.data.vehicleType || "carro");
        setStep("review");
        toast.success("Dados extraídos com sucesso! Revise antes de salvar.");
      } else {
        toast.error(result.error || "Não foi possível extrair os dados");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao processar documento");
    },
  });

  const createVehicleMutation = trpc.vehicles.create.useMutation({
    onSuccess: (result) => {
      toast.success("Veículo cadastrado com sucesso!");
      navigate(`/vehicles/${result.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao cadastrar veículo");
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Convert to base64 for API
    const buffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    extractMutation.mutate({
      imageBase64: base64,
      mimeType: file.type,
    });
  };

  const handleSave = () => {
    if (!plate.trim() || !model.trim() || !year.trim()) {
      toast.error("Placa, modelo e ano são obrigatórios");
      return;
    }

    setStep("saving");
    createVehicleMutation.mutate({
      plate: plate.trim().toUpperCase(),
      model: model.trim(),
      brand: brand.trim() || undefined,
      year: parseInt(year),
      color: color.trim() || undefined,
      vehicleType: vehicleType as "carro" | "caminhonete" | "moto" | "van" | "caminhao",
      chassi: chassi.trim() || undefined,
      renavam: renavam.trim() || undefined,
      observations: observations.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/vehicles">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title="Cadastro por IA"
          description="Envie uma foto do CRLV e a IA preencherá os dados automaticamente"
          icon={Bot}
        />
      </div>

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Enviar Documento
            </CardTitle>
            <CardDescription>
              Tire uma foto ou envie uma imagem do CRLV, CRV ou documento do veículo.
              A IA extrairá os dados automaticamente para sua revisão.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {extractMutation.isPending ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div>
                    <p className="text-lg font-medium">Analisando documento...</p>
                    <p className="text-sm text-muted-foreground">A IA está extraindo os dados do veículo</p>
                  </div>
                </div>
              ) : imagePreview ? (
                <div className="flex flex-col items-center gap-4">
                  <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg" />
                  <p className="text-sm text-muted-foreground">Clique para trocar a imagem</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Clique para enviar</p>
                    <p className="text-sm text-muted-foreground">
                      Aceita: JPG, PNG, WebP (máx. 10MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </CardContent>
        </Card>
      )}

      {step === "review" && extractedData && (
        <>
          <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Dados extraídos com sucesso</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Revise e corrija os dados abaixo antes de salvar o veículo.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Revisão dos Dados
              </CardTitle>
              <CardDescription>
                Campos preenchidos pela IA. Corrija o que for necessário.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Placa *</Label>
                  <Input
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    placeholder="ABC-1234"
                    className={!plate ? "border-red-300" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Veículo *</Label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carro">Carro</SelectItem>
                      <SelectItem value="caminhonete">Caminhonete</SelectItem>
                      <SelectItem value="moto">Moto</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                      <SelectItem value="caminhao">Caminhão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ex: Toyota, Fiat..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Ex: Hilux, Uno..."
                    className={!model ? "border-red-300" : ""}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Ano *</Label>
                  <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2024"
                    className={!year ? "border-red-300" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Ex: Branco, Prata..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chassi</Label>
                  <Input
                    value={chassi}
                    onChange={(e) => setChassi(e.target.value)}
                    placeholder="Número do chassi"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>RENAVAM</Label>
                  <Input
                    value={renavam}
                    onChange={(e) => setRenavam(e.target.value)}
                    placeholder="Número do RENAVAM"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Observações adicionais..."
                  className="min-h-[80px]"
                />
              </div>

              {extractedData.ownerName && (
                <Card className="bg-muted/50">
                  <CardContent className="py-3">
                    <p className="text-sm text-muted-foreground">
                      <strong>Proprietário detectado:</strong> {extractedData.ownerName}
                      {extractedData.ownerCpfCnpj && ` (${extractedData.ownerCpfCnpj})`}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep("upload");
                    setExtractedData(null);
                    setImagePreview(null);
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Enviar Outro Documento
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!plate.trim() || !model.trim() || !year.trim() || createVehicleMutation.isPending}
                >
                  {createVehicleMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Cadastrar Veículo
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

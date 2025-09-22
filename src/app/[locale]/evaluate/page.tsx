"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSession } from 'next-auth/react';

type CalcMethod = "basic" | "advanced";

export default function EvaluatePage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calculationMethod, setCalculationMethod] = useState<CalcMethod>("basic");
  const [result, setResult] = useState<any>(null);
  const [lastFormData, setLastFormData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSavedCalculations, setShowSavedCalculations] = useState(false);
  const [savedCalculations, setSavedCalculations] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Sliders store FRACTIONS (e.g. 0.03) and we show them as %.
  const [sliderValues, setSliderValues] = useState({
    acquisitionCostRate: 0.03,
    vacancyRate: 0.02,
    maintenanceRate: 0.015,
    propertyMgmtRate: 0.08,
    loanTermYears: 25,
    appreciationRate: 0.015,
    marginalTaxRate: 0.25,
  });

  // helpers
  const num = (fd: FormData, k: string, def = 0) => Number(fd.get(k) ?? def);
  const pctToFraction = (v: number) => (v > 1 ? v / 100 : v); // accept "2" or "0.02"

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);

    const fd = new FormData(e.currentTarget);

    // Common inputs (CHF; rates as fractions)
    const interestRate = pctToFraction(num(fd, "interest"));
    const repaymentRate = pctToFraction(num(fd, "repaymentRatePct")); // NEW: needed for annuity
    const loanTermYears = num(fd, "loanTermYears") || num(fd, "term") || 25; // single source of truth

    const payload: any = {
      calculationMethod,
      // CHF (no cents)
      purchasePrice: num(fd, "purchasePrice"),
      expectedMonthlyRent: num(fd, "rent"),
      equity: num(fd, "equity"),
      operatingMonthlyExpenses: num(fd, "otherCosts"),
      // rates
      interestRate,
      repaymentRate, // can be 0 for interest-only or if user sets 0
      loanTermYears,
    };

    if (calculationMethod === "advanced") {
      payload.propertySizeSqm = num(fd, "propertySize") || 100;
      payload.acquisitionCostRate = pctToFraction(num(fd, "acquisitionCostRate"));
      payload.vacancyRate = pctToFraction(num(fd, "vacancyRate"));
      payload.maintenanceRate = pctToFraction(num(fd, "maintenanceRate"));
      payload.propertyMgmtRate = pctToFraction(num(fd, "propertyMgmtRate"));
      payload.insuranceAndTaxesAnnual = num(fd, "insuranceAndTaxesAnnual");
      payload.loanType = (fd.get("loanType") || "annuity") as "annuity" | "interestOnly";
      payload.appreciationRate = pctToFraction(num(fd, "appreciationRate"));
      payload.marginalTaxRate = fd.get("marginalTaxRate") ? pctToFraction(num(fd, "marginalTaxRate") as any) : undefined;
      payload.depreciationAnnual = num(fd, "depreciationAnnual");
      payload.otherAnnualOpex = num(fd, "otherAnnualOpex");
      payload.oneTimeCosts = num(fd, "oneTimeCosts");
      payload.financeCosts = fd.get("financeCosts") === "on";
    }

    // Store form data for saving later
    setLastFormData(payload);

    const res = await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Evaluation failed");
      return;
    }
    const data = await res.json();
    setResult(data);
    setSaveSuccess(false); // Reset save success when new calculation is made
  }

  async function saveCalculation() {
    if (!result || !lastFormData) return;
    
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          ...lastFormData,
          saveCalculation: true // Flag to indicate this should be saved
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error((errorData as any).error || `Failed to save calculation (${res.status})`);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000); // Hide success message after 3 seconds
      
      // Refresh saved calculations list
      if (showSavedCalculations) {
        loadSavedCalculations();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save calculation");
    } finally {
      setSaving(false);
    }
  }

  async function loadSavedCalculations() {
    setLoadingSaved(true);
    setError(null);

    try {
      const res = await fetch("/api/evaluations/list", {
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error((errorData as any).error || `Failed to load saved calculations (${res.status})`);
      }

      const data = await res.json();
      setSavedCalculations(data);
    } catch (err) {
      console.error("Error loading saved calculations:", err);
      setError(err instanceof Error ? err.message : "Failed to load saved calculations");
    } finally {
      setLoadingSaved(false);
    }
  }

  async function deleteCalculation(calculationId: string) {
    if (!confirm("Are you sure you want to delete this calculation?")) {
      return;
    }

    try {
      const res = await fetch(`/api/evaluations/${calculationId}`, {
        method: "DELETE",
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error((errorData as any).error || `Failed to delete calculation (${res.status})`);
      }

      // Remove the deleted calculation from the list
      setSavedCalculations(prev => prev.filter(calc => calc.id !== calculationId));
    } catch (err) {
      console.error("Error deleting calculation:", err);
      setError(err instanceof Error ? err.message : "Failed to delete calculation");
    }
  }

  function toggleSavedCalculations() {
    if (!showSavedCalculations) {
      loadSavedCalculations();
    }
    setShowSavedCalculations(!showSavedCalculations);
  }

  function loadCalculationIntoForm(calculation: any) {
    // Set the calculation method first
    if (calculation.calculationMethod) {
      setCalculationMethod(calculation.calculationMethod as CalcMethod);
    }

    // Load the calculation data back into the form
    const form = document.querySelector('form');
    if (!form) return;

    // Set basic fields
    const fields = [
      { name: 'purchasePrice', value: calculation.purchasePrice },
      { name: 'rent', value: calculation.expectedMonthlyRent },
      { name: 'equity', value: calculation.equity || 0 },
      { name: 'interest', value: calculation.interestRate * 100 }, // Convert back to percentage
      { name: 'otherCosts', value: calculation.monthlyOtherCosts },
      { name: 'loanTermYears', value: calculation.loanTermYears },
    ];

    fields.forEach(({ name, value }) => {
      const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
      if (input && value !== null && value !== undefined) {
        input.value = value.toString();
      }
    });

    // Load the calculation results
    if (calculation.resultJson) {
      setResult(calculation.resultJson);
    }

    // Hide saved calculations panel
    setShowSavedCalculations(false);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">{t("evaluate.title")}</h1>
      
      {/* Calculation Method Switcher */}
      <div className="mb-6 border rounded p-4 bg-gray-50">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-medium">{t("evaluate.calculationMethod")}</h3>
          {session && status === "authenticated" && (
            <button
              type="button"
              onClick={toggleSavedCalculations}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              {t("evaluate.viewSavedCalculations")}
            </button>
          )}
        </div>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setCalculationMethod("basic")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              calculationMethod === "basic"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {t("evaluate.basicCalculation")}
          </button>
          <button
            type="button"
            onClick={() => setCalculationMethod("advanced")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              calculationMethod === "advanced"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {t("evaluate.advancedCalculation")}
          </button>
        </div>
        <p className="text-sm text-gray-600">
          {calculationMethod === "basic" ? t("evaluate.basicDescription") : t("evaluate.advancedDescription")}
        </p>
      </div>

      {/* Saved Calculations Panel */}
      {showSavedCalculations && session && status === "authenticated" && (
        <div className="mb-6 border rounded p-4 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">{t("evaluate.savedCalculations")}</h3>
            <button
              type="button"
              onClick={() => setShowSavedCalculations(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          {loadingSaved ? (
            <div className="text-center py-4">{t("common.loading")}</div>
          ) : savedCalculations.length === 0 ? (
            <div className="text-center py-4 text-gray-500">{t("evaluate.noSavedCalculations")}</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {savedCalculations.map((calc) => (
                <div key={calc.id} className="border rounded p-3 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {t("common.currencySymbol")}{calc.purchasePrice.toLocaleString()} - {t("common.currencySymbol")}{calc.expectedMonthlyRent}/Monat
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(calc.createdAt).toLocaleDateString()} - {calc.interestRate * 100}% Zins - {calc.calculationMethod === 'advanced' ? t('evaluate.advancedCalculation') : t('evaluate.basicCalculation')}
                      </div>
                      <div className="text-xs mt-1">
                        <span className={`px-2 py-1 rounded text-xs ${
                          calc.recommendation === "GREEN" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {calc.recommendation === "GREEN" ? t("evaluate.buy") : "Nicht kaufen"}
                        </span>
                        <span className="ml-2 text-gray-600">
                          {t("evaluate.netYield")}: {calc.netYieldPct?.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="ml-2 flex gap-1">
                      <button
                        onClick={() => loadCalculationIntoForm(calc)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        {t("evaluate.loadSavedCalculation")}
                      </button>
                      <button
                        onClick={() => deleteCalculation(calc.id)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        {t("evaluate.deleteCalculation")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded p-4">
        <label className="text-sm">
          {t("evaluate.purchasePrice")} ({t("common.currencySymbol")})
          <input name="purchasePrice" type="number" step="0.01" className="w-full border rounded px-3 py-2" required />
        </label>

        <label className="text-sm">
          {t("evaluate.monthlyRent")} ({t("common.currencySymbol")})
          <input name="rent" type="number" step="0.01" className="w-full border rounded px-3 py-2" required />
        </label>

        <label className="text-sm">
          {t("evaluate.equity")} ({t("common.currencySymbol")})
          <input name="equity" type="number" step="0.01" className="w-full border rounded px-3 py-2" />
        </label>

        <label className="text-sm">
          {t("evaluate.interestRate")} (% p.a.)
          <input name="interest" type="number" step="0.01" className="w-full border rounded px-3 py-2" required />
        </label>

        {/* Repayment (used in both modes if loanType=annuity) */}
        <label className="text-sm">
          {t("evaluate.repaymentRate")} (% p.a.)
          <input name="repaymentRatePct" type="number" step="0.01" className="w-full border rounded px-3 py-2" defaultValue="2" />
        </label>

        {/* Unified loan term */}
        <label className="text-sm">
          {t("evaluate.loanTermYears")}
          <input name="loanTermYears" type="number" step="1" className="w-full border rounded px-3 py-2" defaultValue={sliderValues.loanTermYears} />
        </label>

        {calculationMethod === "advanced" && (
          <>
            <div>
              <label className="text-sm">
                {t("evaluate.propertySize")}
                <input name="propertySize" type="number" className="w-full border rounded px-3 py-2" defaultValue="120" />
              </label>
              <p className="text-xs text-gray-500 mt-1">Property size in square meters</p>
            </div>

            <div>
              <label className="text-sm">
                {t("evaluate.acquisitionCostRate")} ({(sliderValues.acquisitionCostRate * 100).toFixed(1)}%)
                <input
                  name="acquisitionCostRate"
                  type="range"
                  min="0"
                  max="0.08"
                  step="0.001"
                  value={sliderValues.acquisitionCostRate}
                  onChange={(e) => setSliderValues((p) => ({ ...p, acquisitionCostRate: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">{t("evaluate.acquisitionCostRateDesc")}</p>
            </div>

            <div>
              <label className="text-sm">
                {t("evaluate.vacancyRate")} ({(sliderValues.vacancyRate * 100).toFixed(1)}%)
                <input
                  name="vacancyRate"
                  type="range"
                  min="0"
                  max="0.15"
                  step="0.001"
                  value={sliderValues.vacancyRate}
                  onChange={(e) => setSliderValues((p) => ({ ...p, vacancyRate: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">{t("evaluate.vacancyRateDesc")}</p>
            </div>

            <div>
              <label className="text-sm">
                {t("evaluate.maintenanceRate")} ({(sliderValues.maintenanceRate * 100).toFixed(1)}%)
                <input
                  name="maintenanceRate"
                  type="range"
                  min="0"
                  max="0.05"
                  step="0.001"
                  value={sliderValues.maintenanceRate}
                  onChange={(e) => setSliderValues((p) => ({ ...p, maintenanceRate: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">{t("evaluate.maintenanceRateDesc")}</p>
            </div>

            <div>
              <label className="text-sm">
                {t("evaluate.propertyMgmtRate")} ({(sliderValues.propertyMgmtRate * 100).toFixed(1)}%)
                <input
                  name="propertyMgmtRate"
                  type="range"
                  min="0"
                  max="0.15"
                  step="0.001"
                  value={sliderValues.propertyMgmtRate}
                  onChange={(e) => setSliderValues((p) => ({ ...p, propertyMgmtRate: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">{t("evaluate.propertyMgmtRateDesc")}</p>
            </div>

            <div>
              <label className="text-sm">
                {t("evaluate.insuranceAndTaxesAnnual")} ({t("common.currencySymbol")})
                <input name="insuranceAndTaxesAnnual" type="number" step="100" className="w-full border rounded px-3 py-2" defaultValue="2400" />
              </label>
              <p className="text-xs text-gray-500 mt-1">{t("evaluate.insuranceAndTaxesAnnualDesc")}</p>
            </div>

            <div>
              <label className="text-sm">
                {t("evaluate.loanType")}
                <select name="loanType" className="w-full border rounded px-3 py-2" defaultValue="annuity">
                  <option value="annuity">{t("evaluate.loanTypeAnnuity")}</option>
                  <option value="interestOnly">{t("evaluate.loanTypeInterestOnly")}</option>
                </select>
              </label>
              <p className="text-xs text-gray-500 mt-1">{t("evaluate.loanTypeDesc")}</p>
            </div>

            <div>
              <label className="text-sm">
                {t("evaluate.appreciationRate")} ({(sliderValues.appreciationRate * 100).toFixed(1)}%)
                <input
                  name="appreciationRate"
                  type="range"
                  min="0"
                  max="0.05"
                  step="0.001"
                  value={sliderValues.appreciationRate}
                  onChange={(e) => setSliderValues((p) => ({ ...p, appreciationRate: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">{t("evaluate.appreciationRateDesc")}</p>
            </div>

            <div>
              <label className="text-sm">
                {t("evaluate.marginalTaxRate")} ({(sliderValues.marginalTaxRate * 100).toFixed(1)}%)
                <input
                  name="marginalTaxRate"
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.001"
                  value={sliderValues.marginalTaxRate}
                  onChange={(e) => setSliderValues((p) => ({ ...p, marginalTaxRate: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">{t("evaluate.marginalTaxRateDesc")}</p>
            </div>

            <div>
              <label className="text-sm">
                {t("evaluate.depreciationAnnual")} ({t("common.currencySymbol")})
                <input name="depreciationAnnual" type="number" step="100" className="w-full border rounded px-3 py-2" defaultValue="5000" />
              </label>
              <p className="text-xs text-gray-500 mt-1">{t("evaluate.depreciationAnnualDesc")}</p>
            </div>

            <div>
              <label className="text-sm">
                {t("evaluate.otherAnnualOpex")} ({t("common.currencySymbol")})
                <input name="otherAnnualOpex" type="number" step="100" className="w-full border rounded px-3 py-2" defaultValue="1200" />
              </label>
              <p className="text-xs text-gray-500 mt-1">{t("evaluate.otherAnnualOpexDesc")}</p>
            </div>

            <div>
              <label className="text-sm">
                {t("evaluate.oneTimeCosts")} ({t("common.currencySymbol")})
                <input name="oneTimeCosts" type="number" step="1000" className="w-full border rounded px-3 py-2" defaultValue="15000" />
              </label>
              <p className="text-xs text-gray-500 mt-1">{t("evaluate.oneTimeCostsDesc")}</p>
            </div>

            <div>
              <label className="text-sm flex items-center">
                <input name="financeCosts" type="checkbox" className="mr-2" defaultChecked />
                {t("evaluate.financeCosts")}
              </label>
              <p className="text-xs text-gray-500 mt-1">{t("evaluate.financeCostsDesc")}</p>
            </div>
          </>
        )}

        <label className="text-sm">
          {t("evaluate.monthlyExpenses")} ({t("common.currencySymbol")})
          <input name="otherCosts" type="number" step="0.01" className="w-full border rounded px-3 py-2" />
        </label>

        <button disabled={loading} className="md:col-span-2 bg-black text-white rounded py-2">
          {loading ? t("common.loading") : t("evaluate.evaluate")}
        </button>
        {error && <div className="md:col-span-2 text-red-600 text-sm">{error}</div>}
      </form>

      {/* Results */}
      {result && (
        <div className="mt-6">
          {/* Save Button */}
          {session && status === "authenticated" ? (
            <div className="mb-4 flex justify-end">
              <button
                onClick={saveCalculation}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? t("common.saving") : t("evaluate.saveCalculation")}
              </button>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                💡 {t("evaluate.loginToSave")}
              </p>
            </div>
          )}
          
          {/* Success/Error Messages */}
          {saveSuccess && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded-md">
              {t("evaluate.calculationSaved")}
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-md">
              {error}
            </div>
          )}

          {/* Evaluation Results */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-lg">
            <div className="flex items-center mb-4">
              <div className="w-2 h-8 bg-blue-500 rounded-full mr-3"></div>
              <h3 className="text-xl font-semibold text-gray-800">{t('evaluate.evaluationResults')}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">{t('evaluate.grossYield')}</div>
                <div className="text-2xl font-bold text-gray-800">{result.grossYieldPct?.toFixed(2)}%</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">{t('evaluate.netYield')}</div>
                <div className="text-2xl font-bold text-gray-800">{result.netYieldPct?.toFixed(2)}%</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">{t('evaluate.monthlyCashflow')}</div>
                <div className="text-2xl font-bold text-gray-800">
                  {t('common.currencySymbol')}{Math.round((result.monthlyCashflowCents || 0) / 100)}
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">{t('evaluate.recommendation')}</div>
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                  result.recommendation === 'GREEN' ? 'bg-green-100 text-green-800 border border-green-200' :
                  'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {result.recommendation === 'GREEN' ? '✓ Kaufen' : '✗ Nicht kaufen'}
                </span>
              </div>
            </div>
          </div>

          {/* Advanced Results */}
          {result.advancedMetrics && (
            <div className="mt-6 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-2 h-6 bg-purple-500 rounded-full mr-3"></div>
                <h4 className="text-lg font-semibold text-gray-800">{t('evaluate.advancedCalculation')}</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">Cash-on-Cash Return</div>
                  <div className="text-xl font-bold text-gray-800">
                    {(result.advancedMetrics.cashOnCashReturn || 0).toFixed(2)}%
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">Cap Rate</div>
                  <div className="text-xl font-bold text-gray-800">{(result.advancedMetrics.capRate || 0).toFixed(2)}%</div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">Total ROI</div>
                  <div className="text-xl font-bold text-gray-800">
                    {(result.advancedMetrics.totalROI || 0).toFixed(2)}%
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">LTV Ratio</div>
                  <div className="text-xl font-bold text-gray-800">
                    {(result.advancedMetrics.ltvRatio || 0).toFixed(1)}%
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">DSCR</div>
                  <div className="text-xl font-bold text-gray-800">
                    {(result.advancedMetrics.dscr || 0).toFixed(2)}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">Price per m²</div>
                  <div className="text-xl font-bold text-gray-800">{t('common.currencySymbol')}{Math.round(result.advancedMetrics.pricePerSqm || 0)}</div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">Payback Period</div>
                  <div className="text-xl font-bold text-gray-800">{(result.advancedMetrics.paybackPeriodYears || 0).toFixed(1)} Jahre</div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Breakdown */}
          {result.detailedBreakdown && (
            <div className="mt-6 pt-6 border-t border-gray-300">
              <div className="flex items-center mb-4">
                <div className="w-2 h-6 bg-gray-400 rounded-full mr-3"></div>
                <h4 className="text-lg font-semibold text-gray-800">{t('evaluate.detailedBreakdown')}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Investment Details */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-sm font-bold">€</span>
                    </div>
                    <h5 className="font-semibold text-gray-800">{t('evaluate.investment')}</h5>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('evaluate.acquisitionCosts')}:</span>
                      <span className="font-medium">{t('common.currencySymbol')}{Math.round(result.detailedBreakdown.acquisitionCosts || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('evaluate.financedBase')}:</span>
                      <span className="font-medium">{t('common.currencySymbol')}{Math.round(result.detailedBreakdown.financedBase || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('evaluate.loanAmount')}:</span>
                      <span className="font-medium">{t('common.currencySymbol')}{Math.round(result.detailedBreakdown.loanAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-gray-600">{t('evaluate.marketValueY1')}:</span>
                      <span className="font-medium">{t('common.currencySymbol')}{Math.round(result.detailedBreakdown.marketValueY1 || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Income Details */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-sm font-bold">↗</span>
                    </div>
                    <h5 className="font-semibold text-gray-800">{t('evaluate.income')}</h5>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('evaluate.grossAnnualRent')}:</span>
                      <span className="font-medium">{t('common.currencySymbol')}{Math.round(result.detailedBreakdown.grossAnnualRent || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('evaluate.economicVacancy')}:</span>
                      <span className="font-medium text-red-600">-{t('common.currencySymbol')}{Math.round(result.detailedBreakdown.economicVacancy || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('evaluate.effectiveGrossIncome')}:</span>
                      <span className="font-medium">{t('common.currencySymbol')}{Math.round(result.detailedBreakdown.effectiveGrossIncome || 0)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-gray-600">{t('evaluate.netOperatingIncome')}:</span>
                      <span className="font-medium">{t('common.currencySymbol')}{Math.round(result.detailedBreakdown.netOperatingIncome || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Expense Details */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-sm font-bold">↘</span>
                    </div>
                    <h5 className="font-semibold text-gray-800">{t('evaluate.expenses')}</h5>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('evaluate.maintenance')}:</span>
                      <span className="font-medium text-red-600">-{t('common.currencySymbol')}{Math.round(result.detailedBreakdown.maintenanceAnnual || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('evaluate.management')}:</span>
                      <span className="font-medium text-red-600">-{t('common.currencySymbol')}{Math.round(result.detailedBreakdown.propertyMgmtAnnual || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('evaluate.interest')}:</span>
                      <span className="font-medium text-red-600">-{t('common.currencySymbol')}{Math.round(result.detailedBreakdown.interestAnnual || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('evaluate.repayment')}:</span>
                      <span className="font-medium text-red-600">-{t('common.currencySymbol')}{Math.round(result.detailedBreakdown.repaymentAnnual || 0)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-gray-600">{t('evaluate.totalOpEx')}:</span>
                      <span className="font-medium text-red-600">-{t('common.currencySymbol')}{Math.round(result.detailedBreakdown.totalAnnualOpex || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Cashflow Details */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-sm font-bold">💰</span>
                    </div>
                    <h5 className="font-semibold text-gray-800">{t('evaluate.cashflow')}</h5>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('evaluate.annualCashflow')}:</span>
                      <span className={`font-medium ${(result.detailedBreakdown.cashflowAnnual || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t('common.currencySymbol')}{Math.round(result.detailedBreakdown.cashflowAnnual || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('evaluate.taxes')}:</span>
                      <span className="font-medium text-red-600">-{t('common.currencySymbol')}{Math.round(result.detailedBreakdown.taxAnnual || 0)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-gray-600 font-semibold">{t('evaluate.cashflowAfterTax')}:</span>
                      <span className={`font-bold text-lg ${(result.detailedBreakdown.cashflowAfterTax || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t('common.currencySymbol')}{Math.round(result.detailedBreakdown.cashflowAfterTax || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
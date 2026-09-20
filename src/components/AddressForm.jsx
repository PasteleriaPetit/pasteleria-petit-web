import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";

import {
  required,
  isValidPostalCodeMX,
  isValidPhoneMX,
} from "../utils/mx-address";

export default function AddressForm({ onSelected }) {
  const { user } = useAuth();

  // ============================================================
  // DIRECCIONES GUARDADAS
  // ============================================================

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [useNew, setUseNew] = useState(true);

  const [
    selectedAddressId,
    setSelectedAddressId,
  ] = useState("");

  // ============================================================
  // FECHA / HORARIO / NOTAS DE ENTREGA
  // ============================================================

  const [deliveryDate, setDeliveryDate] =
    useState("");

  const [
    deliveryWindow,
    setDeliveryWindow,
  ] = useState("");

  const [
    deliveryNotes,
    setDeliveryNotes,
  ] = useState("");

  // ============================================================
  // FORMULARIO NUEVA DIRECCIÓN
  // ============================================================

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    street: "",
    extNumber: "",
    intNumber: "",
    neighborhood: "",
    postalCode: "",
    city: "",
    state: "",
    country: "México",
    references: "",
  });

  const [errors, setErrors] = useState({});

  // ============================================================
  // HORARIOS
  // ============================================================

  const normalWindows = [
    {
      value: "10:00-14:00",
      label: "10:00 a.m. - 2:00 p.m.",
    },
    {
      value: "14:00-16:00",
      label: "2:00 p.m. - 4:00 p.m.",
    },
  ];

  const extendedWindows = [
    {
      value: "08:00-10:00",
      label: "8:00 a.m. - 10:00 a.m.",
    },
    {
      value: "10:00-12:00",
      label: "10:00 a.m. - 12:00 p.m.",
    },
    {
      value: "12:00-14:00",
      label: "12:00 p.m. - 2:00 p.m.",
    },
    {
      value: "14:00-16:00",
      label: "2:00 p.m. - 4:00 p.m.",
    },
  ];

  // ============================================================
  // FECHA LOCAL
  // ============================================================

  const getToday = () => {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // ============================================================
  // DÍAS DE ANTICIPACIÓN
  // ============================================================

  const getDaysAhead = (dateString) => {
    if (!dateString) return 0;

    const [year, month, day] = dateString
      .split("-")
      .map(Number);

    const selected = new Date(
      year,
      month - 1,
      day
    );

    selected.setHours(0, 0, 0, 0);

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return Math.round(
      (selected.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  };

  const daysAhead = deliveryDate
    ? getDaysAhead(deliveryDate)
    : 0;

  // ============================================================
  // HORARIOS DISPONIBLES
  //
  // Menos de 2 días:
  // 10-14 / 14-16
  //
  // 2 días o más:
  // ventanas de 2 horas
  // ============================================================

  const availableWindows = useMemo(() => {
    return daysAhead >= 2
      ? extendedWindows
      : normalWindows;
  }, [daysAhead]);

  // ============================================================
  // CARGAR DIRECCIONES
  // ============================================================

  useEffect(() => {
    if (!user) {
      setList([]);
      setSelectedAddressId("");
      setUseNew(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadAddresses = async () => {
      setLoading(true);

      try {
        const snap = await getDocs(
          collection(
            db,
            `users/${user.uid}/addresses`
          )
        );

        if (cancelled) return;

        const data = snap.docs.map(
          (document) => ({
            id: document.id,
            ...document.data(),
          })
        );

        setList(data);

        if (data.length > 0) {
          setUseNew(false);
          setSelectedAddressId(
            data[0].id
          );
        } else {
          setUseNew(true);
          setSelectedAddressId("");
        }
      } catch (error) {
        console.error(
          "Error cargando direcciones:",
          error
        );

        if (!cancelled) {
          setList([]);
          setUseNew(true);
          setSelectedAddressId("");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAddresses();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // ============================================================
  // DIRECCIÓN ACTUAL
  // ============================================================

  const selectedAddress = useMemo(() => {
    if (
      useNew ||
      !selectedAddressId
    ) {
      return null;
    }

    return (
      list.find(
        (address) =>
          address.id === selectedAddressId
      ) || null
    );
  }, [
    list,
    selectedAddressId,
    useNew,
  ]);

  // ============================================================
  // EMITIR DIRECCIÓN + PROGRAMACIÓN DE ENTREGA
  //
  // IMPORTANTE:
  // Mandamos la dirección incluso si todavía no hay fecha/horario.
  //
  // Así ShippingPicker puede consultar inmediatamente:
  // deliveryCoverage/{postalCode}
  // ============================================================

  useEffect(() => {
    if (!selectedAddress) {
      onSelected?.(null);
      return;
    }

    onSelected?.({
      ...selectedAddress,

      deliveryDate:
        deliveryDate || "",

      deliveryWindow:
        deliveryWindow || "",

      notas:
        deliveryNotes.trim(),
    });
  }, [
    selectedAddress,
    deliveryDate,
    deliveryWindow,
    deliveryNotes,
    onSelected,
  ]);

  // ============================================================
  // SI CAMBIA FECHA Y EL HORARIO YA NO ES VÁLIDO,
  // LIMPIAR HORARIO
  // ============================================================

  useEffect(() => {
    if (!deliveryWindow) return;

    const stillValid =
      availableWindows.some(
        (window) =>
          window.value ===
          deliveryWindow
      );

    if (!stillValid) {
      setDeliveryWindow("");
    }
  }, [
    deliveryDate,
    deliveryWindow,
    availableWindows,
  ]);

  // ============================================================
  // ACTUALIZAR FORMULARIO
  // ============================================================

  const set = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  // ============================================================
  // VALIDACIÓN NUEVA DIRECCIÓN
  // ============================================================

  const validate = () => {
    const newErrors = {};

    if (!required(form.fullName)) {
      newErrors.fullName =
        "Requerido";
    }

    if (!isValidPhoneMX(form.phone)) {
      newErrors.phone =
        "Teléfono inválido";
    }

    if (!required(form.street)) {
      newErrors.street =
        "Requerido";
    }

    if (!required(form.extNumber)) {
      newErrors.extNumber =
        "Requerido";
    }

    if (!required(form.neighborhood)) {
      newErrors.neighborhood =
        "Requerido";
    }

    if (
      !isValidPostalCodeMX(
        form.postalCode
      )
    ) {
      newErrors.postalCode =
        "CP inválido (5 dígitos)";
    }

    if (!required(form.city)) {
      newErrors.city =
        "Requerido";
    }

    if (!required(form.state)) {
      newErrors.state =
        "Requerido";
    }

    if (!required(form.country)) {
      newErrors.country =
        "Requerido";
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors).length ===
      0
    );
  };

  // ============================================================
  // GUARDAR NUEVA DIRECCIÓN
  // ============================================================

  const save = async () => {
    if (!user) return;

    if (!validate()) return;

    setSaving(true);

    try {
      // IMPORTANTE:
      // Solo guardamos la dirección.
      //
      // Fecha, horario y notas pertenecen al pedido,
      // no a la dirección guardada.

      const ref = await addDoc(
        collection(
          db,
          `users/${user.uid}/addresses`
        ),
        {
          ...form,
          createdAt: new Date(),
        }
      );

      const saved = {
        id: ref.id,
        ...form,
      };

      setList((previous) => [
        saved,
        ...previous,
      ]);

      setSelectedAddressId(
        saved.id
      );

      setUseNew(false);

      setErrors({});
    } catch (error) {
      console.error(
        "Error guardando dirección:",
        error
      );

      alert(
        "No fue posible guardar la dirección."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // CAMBIAR DIRECCIÓN
  // ============================================================

  const handleAddressChange = (
    event
  ) => {
    const id = event.target.value;

    // NUEVA DIRECCIÓN
    if (!id) {
      setUseNew(true);
      setSelectedAddressId("");
      return;
    }

    // DIRECCIÓN EXISTENTE
    const found = list.find(
      (address) =>
        address.id === id
    );

    if (!found) return;

    setSelectedAddressId(id);
    setUseNew(false);
  };

  // ============================================================
  // CANCELAR NUEVA DIRECCIÓN
  // ============================================================

  const cancelNewAddress = () => {
    if (list.length === 0) {
      return;
    }

    const fallback =
      list.find(
        (address) =>
          address.id ===
          selectedAddressId
      ) || list[0];

    setSelectedAddressId(
      fallback.id
    );

    setUseNew(false);
  };

  // ============================================================
  // SIN SESIÓN
  // ============================================================

  if (!user) {
    return (
      <div className="p-4 border rounded-md text-wineDark/80">
        Inicia sesión para capturar tu
        dirección.
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="bg-white rounded-xl border border-rose/30 p-4 shadow-sm">

      {/* ==================================================== */}
      {/* DIRECCIÓN */}
      {/* ==================================================== */}

      <h3 className="text-wine text-lg font-semibold mb-3">
        Dirección de envío
      </h3>

      {/* ==================================================== */}
      {/* CARGANDO */}
      {/* ==================================================== */}

      {loading && (
        <p className="text-sm text-wineDark/70">
          Cargando direcciones...
        </p>
      )}

      {/* ==================================================== */}
      {/* SELECTOR DIRECCIONES */}
      {/* ==================================================== */}

      {!loading &&
        list.length > 0 && (
          <div className="mb-4">

            <label className="text-sm text-wineDark/80 mb-1 block">
              Seleccionar una dirección
              guardada
            </label>

            <select
              className="w-full border rounded-md px-3 py-2"
              value={
                useNew
                  ? ""
                  : selectedAddressId
              }
              onChange={
                handleAddressChange
              }
            >
              <option value="">
                — Nueva dirección —
              </option>

              {list.map(
                (address) => (
                  <option
                    key={address.id}
                    value={address.id}
                  >
                    {address.fullName} ·{" "}
                    {address.street}{" "}
                    {address.extNumber},{" "}
                    {
                      address.neighborhood
                    }
                    , CP{" "}
                    {
                      address.postalCode
                    }
                  </option>
                )
              )}
            </select>
          </div>
        )}

      {/* ==================================================== */}
      {/* FORMULARIO NUEVA DIRECCIÓN */}
      {/* ==================================================== */}

      {useNew && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">

            {/* NOMBRE */}
            <div>
              <label className="block text-sm">
                Nombre completo
              </label>

              <input
                className="w-full border rounded-md px-3 py-2"
                value={
                  form.fullName
                }
                onChange={(event) =>
                  set(
                    "fullName",
                    event.target.value
                  )
                }
              />

              {errors.fullName && (
                <p className="text-red text-xs mt-1">
                  {
                    errors.fullName
                  }
                </p>
              )}
            </div>

            {/* TELÉFONO */}
            <div>
              <label className="block text-sm">
                Teléfono
              </label>

              <input
                className="w-full border rounded-md px-3 py-2"
                value={
                  form.phone
                }
                onChange={(event) =>
                  set(
                    "phone",
                    event.target.value
                  )
                }
              />

              {errors.phone && (
                <p className="text-red text-xs mt-1">
                  {errors.phone}
                </p>
              )}
            </div>

            {/* CALLE */}
            <div className="sm:col-span-2">
              <label className="block text-sm">
                Calle
              </label>

              <input
                className="w-full border rounded-md px-3 py-2"
                value={
                  form.street
                }
                onChange={(event) =>
                  set(
                    "street",
                    event.target.value
                  )
                }
              />

              {errors.street && (
                <p className="text-red text-xs mt-1">
                  {
                    errors.street
                  }
                </p>
              )}
            </div>

            {/* EXTERIOR */}
            <div>
              <label className="block text-sm">
                Núm. exterior
              </label>

              <input
                className="w-full border rounded-md px-3 py-2"
                value={
                  form.extNumber
                }
                onChange={(event) =>
                  set(
                    "extNumber",
                    event.target.value
                  )
                }
              />

              {errors.extNumber && (
                <p className="text-red text-xs mt-1">
                  {
                    errors.extNumber
                  }
                </p>
              )}
            </div>

            {/* INTERIOR */}
            <div>
              <label className="block text-sm">
                Núm. interior (opcional)
              </label>

              <input
                className="w-full border rounded-md px-3 py-2"
                value={
                  form.intNumber
                }
                onChange={(event) =>
                  set(
                    "intNumber",
                    event.target.value
                  )
                }
              />
            </div>

            {/* COLONIA */}
            <div>
              <label className="block text-sm">
                Colonia
              </label>

              <input
                className="w-full border rounded-md px-3 py-2"
                value={
                  form.neighborhood
                }
                onChange={(event) =>
                  set(
                    "neighborhood",
                    event.target.value
                  )
                }
              />

              {errors.neighborhood && (
                <p className="text-red text-xs mt-1">
                  {
                    errors.neighborhood
                  }
                </p>
              )}
            </div>

            {/* CP */}
            <div>
              <label className="block text-sm">
                Código Postal
              </label>

              <input
                className="w-full border rounded-md px-3 py-2"
                value={
                  form.postalCode
                }
                maxLength={5}
                inputMode="numeric"
                onChange={(event) => {
                  const value =
                    event.target.value
                      .replace(
                        /\D/g,
                        ""
                      )
                      .slice(0, 5);

                  set(
                    "postalCode",
                    value
                  );
                }}
              />

              {errors.postalCode && (
                <p className="text-red text-xs mt-1">
                  {
                    errors.postalCode
                  }
                </p>
              )}
            </div>

            {/* CIUDAD */}
            <div>
              <label className="block text-sm">
                Ciudad
              </label>

              <input
                className="w-full border rounded-md px-3 py-2"
                value={
                  form.city
                }
                onChange={(event) =>
                  set(
                    "city",
                    event.target.value
                  )
                }
              />

              {errors.city && (
                <p className="text-red text-xs mt-1">
                  {
                    errors.city
                  }
                </p>
              )}
            </div>

            {/* ESTADO */}
            <div>
              <label className="block text-sm">
                Estado
              </label>

              <input
                className="w-full border rounded-md px-3 py-2"
                value={
                  form.state
                }
                onChange={(event) =>
                  set(
                    "state",
                    event.target.value
                  )
                }
              />

              {errors.state && (
                <p className="text-red text-xs mt-1">
                  {
                    errors.state
                  }
                </p>
              )}
            </div>

            {/* PAÍS */}
            <div>
              <label className="block text-sm">
                País
              </label>

              <input
                className="w-full border rounded-md px-3 py-2"
                value={
                  form.country
                }
                onChange={(event) =>
                  set(
                    "country",
                    event.target.value
                  )
                }
              />

              {errors.country && (
                <p className="text-red text-xs mt-1">
                  {
                    errors.country
                  }
                </p>
              )}
            </div>

            {/* REFERENCIAS */}
            <div>
              <label className="block text-sm">
                Referencias (opcional)
              </label>

              <input
                className="w-full border rounded-md px-3 py-2"
                value={
                  form.references
                }
                onChange={(event) =>
                  set(
                    "references",
                    event.target.value
                  )
                }
              />
            </div>
          </div>

          {/* BOTONES */}

          <div className="mt-4 flex flex-wrap gap-3">

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="
                bg-wine
                text-cream
                px-4
                py-2
                rounded-lg
                hover:opacity-90
                disabled:opacity-60
              "
            >
              {saving
                ? "Guardando..."
                : "Guardar y usar"}
            </button>

            {list.length > 0 && (
              <button
                type="button"
                onClick={
                  cancelNewAddress
                }
                className="
                  border
                  border-wine
                  text-wine
                  px-4
                  py-2
                  rounded-lg
                  hover:bg-rose/20
                "
              >
                Cancelar
              </button>
            )}
          </div>
        </>
      )}

      {/* ==================================================== */}
      {/* FECHA + HORARIO */}
      {/* ==================================================== */}

      {!useNew &&
        selectedAddress && (
          <div className="mt-6 border-t border-rose/30 pt-5">

            <h3 className="text-wine text-lg font-semibold mb-4">
              Fecha y horario de entrega
            </h3>

            <div className="grid md:grid-cols-2 gap-4">

              {/* FECHA */}

              <div>
                <label className="block text-sm text-wineDark/80 mb-1">
                  Fecha de entrega
                </label>

                <input
                  type="date"
                  min={getToday()}
                  value={
                    deliveryDate
                  }
                  onChange={(
                    event
                  ) => {
                    setDeliveryDate(
                      event.target
                        .value
                    );

                    // Forzamos nueva
                    // selección de horario
                    // cuando cambia fecha.
                    setDeliveryWindow(
                      ""
                    );
                  }}
                  className="
                    w-full
                    border
                    rounded-md
                    px-3
                    py-2
                  "
                />
              </div>

              {/* HORARIO */}

              <div>
                <label className="block text-sm text-wineDark/80 mb-1">
                  Horario de entrega
                </label>

                <select
                  value={
                    deliveryWindow
                  }
                  disabled={
                    !deliveryDate
                  }
                  onChange={(
                    event
                  ) =>
                    setDeliveryWindow(
                      event.target
                        .value
                    )
                  }
                  className="
                    w-full
                    border
                    rounded-md
                    px-3
                    py-2
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                >
                  <option value="">
                    Selecciona un
                    horario
                  </option>

                  {availableWindows.map(
                    (window) => (
                      <option
                        key={
                          window.value
                        }
                        value={
                          window.value
                        }
                      >
                        {
                          window.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* MENSAJE HORARIOS */}

            {deliveryDate && (
              <p className="text-xs text-wineDark/60 mt-2">
                {daysAhead >= 2
                  ? "Por solicitar con al menos 2 días de anticipación, puedes elegir horarios de entrega de 2 horas."
                  : "Para esta fecha están disponibles los horarios regulares de entrega."}
              </p>
            )}

            {/* NOTAS */}

            <div className="mt-4">
              <label className="block text-sm text-wineDark/80 mb-1">
                Notas para la entrega
              </label>

              <textarea
                value={
                  deliveryNotes
                }
                onChange={(
                  event
                ) =>
                  setDeliveryNotes(
                    event.target
                      .value
                  )
                }
                rows={3}
                placeholder="Indicaciones adicionales para la entrega..."
                className="
                  w-full
                  border
                  rounded-md
                  px-3
                  py-2
                  resize-none
                "
              />
            </div>

            {/* RESUMEN */}

            {deliveryDate &&
              deliveryWindow && (
                <div className="mt-4 rounded-lg border border-rose/30 bg-cream/30 p-3">
                  <p className="text-sm text-wineDark/80">
                    <span className="font-semibold">
                      Entrega programada:
                    </span>{" "}
                    {deliveryDate}
                    {" · "}
                    {
                      availableWindows.find(
                        (window) =>
                          window.value ===
                          deliveryWindow
                      )?.label
                    }
                  </p>
                </div>
              )}
          </div>
        )}
    </div>
  );
}
import {
  Server,
  ServerCredentials,
  type handleUnaryCall,
  status,
  type ServiceError,
} from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { ReflectionService } from "@grpc/reflection";
import {
  SchedulingServiceService,
  type SchedulingServiceServer,
  ScheduleRequest,
  QueryRequest,
  QueryResponse,
  CancelRequest,
  ListClinicsResponse,
  Clinic,
  TimeRange,
} from "../proto/gen/ts/proto/scheduling/scheduling";
import { Response } from "../proto/gen/ts/proto/common/common";
import { Empty } from "../proto/gen/ts/google/protobuf/empty";

const PORT = process.env.PORT || "50051";
const BIND_ADDRESS = `0.0.0.0:${PORT}`;

const PROTO_ROOT = "./proto";
const SCHEDULING_PROTO = "proto/scheduling/scheduling.proto";

const packageDefinition = protoLoader.loadSync(SCHEDULING_PROTO, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [PROTO_ROOT],
});

const scheduleImpl: handleUnaryCall<ScheduleRequest, Response> = (
  call,
  callback
) => {
  console.log("Schedule called:", call.request);
  const response = Response.create({
    success: true,
    message: `Appointment scheduled for ${call.request.userName} at clinic ${call.request.clinicId}`,
  });
  callback(null, response);
};

const listClinicsImpl: handleUnaryCall<Empty, ListClinicsResponse> = (
  _call,
  callback
) => {
  const response = ListClinicsResponse.create({
    clinics: [
      Clinic.create({ clinicId: "clinic-1", clinicName: "Downtown Clinic" }),
      Clinic.create({ clinicId: "clinic-2", clinicName: "Uptown Clinic" }),
    ],
  });
  callback(null, response);
};

const queryImpl: handleUnaryCall<QueryRequest, QueryResponse> = (
  call,
  callback
) => {
  console.log("Query called for clinic:", call.request.clinicId);
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const response = QueryResponse.create({
    availableSlots: [
      TimeRange.create({ startTime: oneHourLater, endTime: twoHoursLater }),
      TimeRange.create({ startTime: twoHoursLater, endTime: threeHoursLater }),
    ],
  });
  callback(null, response);
};

const cancelImpl: handleUnaryCall<CancelRequest, Response> = (
  call,
  callback
) => {
  console.log("Cancel called for user:", call.request.userId);
  const response = Response.create({
    success: true,
    message: `Appointment cancelled for user ${call.request.userId}`,
  });
  callback(null, response);
};

const server = new Server();
const serviceImpl: SchedulingServiceServer = {
  schedule: scheduleImpl,
  listClinics: listClinicsImpl,
  query: queryImpl,
  cancel: cancelImpl,
};

server.addService(SchedulingServiceService, serviceImpl);

const reflection = new ReflectionService(packageDefinition);
reflection.addToServer(server);

server.bindAsync(BIND_ADDRESS, ServerCredentials.createInsecure(), (err) => {
  if (err) {
    console.error("Failed to bind server:", err);
    process.exit(1);
  }
  console.log(`Scheduling gRPC server running at ${BIND_ADDRESS}`);
});

process.on("SIGINT", () => {
  console.log("\nShutting down gRPC server...");
  server.tryShutdown((err) => {
    if (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
    console.log("Server shut down gracefully.");
    process.exit(0);
  });
});

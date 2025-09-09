export const apache2 = function (projectName, year, thirdPartyLibraries) {
  return `NOTICE

This project makes use of third-party libraries that are licensed under their respective open-source licenses. Below is a list of these libraries, their licenses, and their links for further reference.

================================================================================
Project Name: ${projectName}
Copyright ${year} Viva Republica, Inc

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at:

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

================================================================================
Third-Party Libraries:

${thirdPartyLibraries}

================================================================================

For further details about each license, please refer to the provided links. If there are updates to these dependencies, this file should also be updated.`;
};

export const gpl3 = function (projectName, year, thirdPartyLibraries) {
  return `NOTICE

This project makes use of third-party libraries that are licensed under their respective open-source licenses. Below is a list of these libraries, their licenses, and their links for further reference.

================================================================================
Project Name: ${projectName}
Copyright ${year} Viva Republica, Inc

Licensed under the GPL, Version 3.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at:

    https://www.gnu.org/licenses/gpl-3.0.html

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

================================================================================
Third-Party Libraries:

${thirdPartyLibraries}

================================================================================

For further details about each license, please refer to the provided links. If there are updates to these dependencies, this file should also be updated.`;
};
